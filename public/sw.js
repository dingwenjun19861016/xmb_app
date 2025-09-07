// 小目标 Service Worker - Final Version
const APP_VERSION = '1.0.1'; // 每次部署时更新这个版本号
const CACHE_NAME = `xmb-stock-${APP_VERSION}`;

// 备用接入点配置
const BACKUP_DOMAINS = [
  'https://xmb.chainalert.me',  // 主域名(更新)
  'https://xmb.gostake.io',     // 备用域名1(更新)
  'https://xmb.airdrophunt.xyz'  // 备用域名2(更新)
];

// 域名可用性缓存（避免重复检测）
const domainStatus = new Map();
const DOMAIN_CHECK_CACHE_TIME = 5 * 60 * 1000; // 5分钟缓存

// console.log('[SW] Loading Service Worker version:', APP_VERSION);

// 检测是否为本地开发环境
function isLocalEnvironment() {
  const origin = self.location.origin;
  return origin.includes('localhost') || 
         origin.includes('808')
}

// 检测域名可用性
async function checkDomainAvailability(domain) {
  const cacheKey = `availability_${domain}`;
  const cached = domainStatus.get(cacheKey);
  
  // 如果有缓存且未过期，直接返回
  if (cached && (Date.now() - cached.timestamp) < DOMAIN_CHECK_CACHE_TIME) {
    return cached.available;
  }
  
  try {
    // 使用健康检查端点（假设有 /health 或直接检查根路径）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时
    
    const response = await fetch(`${domain}/favicon.ico`, {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-cache',
      mode: 'no-cors' // 避免CORS问题
    });
    
    clearTimeout(timeoutId);
    
    const available = true; // HEAD请求成功就认为域名可用
    
    // 缓存结果
    domainStatus.set(cacheKey, {
      available,
      timestamp: Date.now()
    });
    
    return available;
  } catch (error) {
    // console.log(`[SW] Domain ${domain} check failed:`, error.message);
    
    // 缓存失败结果（较短时间）
    domainStatus.set(cacheKey, {
      available: false,
      timestamp: Date.now()
    });
    
    return false;
  }
}

// 获取当前可用的域名
async function getAvailableDomain() {
  const currentOrigin = self.location.origin;
  
  // 如果当前域名是主域名，优先使用
  if (currentOrigin === BACKUP_DOMAINS[0]) {
    return currentOrigin;
  }
  
  // 按优先级检查域名可用性
  for (const domain of BACKUP_DOMAINS) {
    if (await checkDomainAvailability(domain)) {
      return domain;
    }
  }
  
  // 如果都不可用，返回当前域名
  return currentOrigin;
}

// 处理域名切换
async function handleDomainSwitch(request) {
  // 🔧 本地开发环境绕过域名切换逻辑
  if (isLocalEnvironment()) {
    console.log('[SW] Local environment detected, bypassing domain switching');
    return await fetch(request);
  }
  
  const currentOrigin = self.location.origin;
  const availableDomain = await getAvailableDomain();
  
  // 如果当前域名不可用，且有可用的备用域名
  if (availableDomain !== currentOrigin) {
    const newUrl = request.url.replace(currentOrigin, availableDomain);
    
    // 对于HTML文档请求，进行重定向
    if (request.destination === 'document') {
      return Response.redirect(newUrl, 302);
    }
    
    // 对于其他资源，尝试从备用域名获取
    try {
      return await fetch(newUrl);
    } catch (error) {
      // 如果备用域名也失败，继续原有逻辑
      throw error;
    }
  }
  
  // 当前域名可用，正常处理
  return await fetch(request);
}

// 安装事件
self.addEventListener('install', (event) => {
  // console.log('[SW] Installing version:', APP_VERSION);
  // 立即激活新版本
  self.skipWaiting();
});

// 激活事件
self.addEventListener('activate', (event) => {
  // console.log('[SW] Activating version:', APP_VERSION);
  
  event.waitUntil(
    Promise.resolve()
      .then(() => {
        // 清理旧缓存
        return caches.keys();
      })
      .then((cacheNames) => {
        const deletePromises = cacheNames
          .filter(cacheName => !cacheName.includes(APP_VERSION))
          .map(cacheName => {
            // console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          });
        return Promise.all(deletePromises);
      })
      .then(() => {
        // 立即控制所有客户端
        return self.clients.claim();
      })
      .catch((error) => {
        console.error('[SW] Activation error:', error);
      })
  );
});

// 网络请求拦截 - 带备用域名支持
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = request.url;
  
  // 跳过以下情况：
  // 1. 非同源请求（但允许备用域名）
  // 2. 非 GET 请求
  // 3. 浏览器扩展文件
  // 4. Chrome 内部请求
  const isBackupDomain = BACKUP_DOMAINS.some(domain => url.startsWith(domain));
  
  if ((!url.startsWith(self.location.origin) && !isBackupDomain) ||
      request.method !== 'GET' ||
      url.includes('extension://') ||
      url.includes('pageProvider.js') ||
      url.includes('provider.js') ||
      url.includes('chrome-') ||
      url.includes('moz-')) {
    return;
  }
  
  // 使用备用域名系统处理请求
  event.respondWith(
    handleDomainSwitch(request)
      .catch(async (error) => {
        // console.log('[SW] Primary fetch failed for:', url, 'Error:', error.message);
        
        // 对于 HTML 文档，返回带备用域名选择的离线页面
        if (request.destination === 'document') {
          return new Response(
            `<!DOCTYPE html>
            <html lang="zh-CN">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>小目标 - 连接问题</title>
              <style>
                body { 
                  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                  text-align: center; 
                  padding: 50px 20px; 
                  background: #f5f5f5;
                  margin: 0;
                }
                .container {
                  max-width: 500px;
                  margin: 0 auto;
                  background: white;
                  padding: 40px;
                  border-radius: 12px;
                  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                h1 { color: #333; margin-bottom: 20px; }
                p { color: #666; margin-bottom: 20px; }
                .backup-links {
                  margin: 30px 0;
                  padding: 20px;
                  background: #f8f9fa;
                  border-radius: 8px;
                }
                .backup-links h3 {
                  color: #333;
                  margin-bottom: 15px;
                  font-size: 16px;
                }
                .backup-link {
                  display: block;
                  margin: 10px 0;
                  padding: 12px 20px;
                  background: #007AFF;
                  color: white;
                  text-decoration: none;
                  border-radius: 6px;
                  font-size: 14px;
                  transition: background 0.2s;
                }
                .backup-link:hover { background: #0056CC; }
                .backup-link.primary { background: #28a745; }
                .backup-link.primary:hover { background: #1e7e34; }
                button {
                  background: #6c757d;
                  color: white;
                  border: none;
                  padding: 12px 24px;
                  border-radius: 6px;
                  font-size: 16px;
                  cursor: pointer;
                  margin: 10px;
                }
                button:hover { background: #545b62; }
                .status { font-size: 12px; color: #999; margin-top: 20px; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>📱 小目标</h1>
                <p>当前接入点连接失败，请尝试以下备用接入点：</p>
                
                <div class="backup-links">
                  <h3>🔄 备用接入点</h3>
                  <a href="https://xmb.chainalert.me" class="backup-link primary">
                    xmb.chainalert.me
                  </a>
                  <a href="https://xmb.gostake.io" class="backup-link">
                    xmb.gostake.io
                  </a>
                  <a href="https://xmb.airdrophunt.me" class="backup-link">
                    xmb.airdrophunt.me
                  </a>
                </div>
                
                <button onclick="location.reload()">重新加载当前页面</button>
                
                <div class="status">
                  当前接入点：${self.location.origin}<br>
                  检测时间：${new Date().toLocaleString('zh-CN')}<br>
                  ${isLocalEnvironment() ? '🔧 本地开发环境 (域名切换已禁用)' : '🌐 生产环境'}
                </div>
              </div>
              
              <script>
                // 自动检测并跳转到可用的域名
                async function autoSwitch() {
                  const domains = [
                    'https://xmb.gostake.io', 
                    'https://xmb.chainalert.me',
                    'https://xmb.airdrophunt.me'
                  ];
                  
                  for (const domain of domains) {
                    if (domain === location.origin) continue;
                    
                    try {
                      const response = await fetch(domain + '/favicon.ico', {
                        method: 'HEAD',
                        mode: 'no-cors',
                        cache: 'no-cache'
                      });
                      
                      console.log('Found available domain:', domain);
                      location.href = domain;
                      return;
                    } catch (e) {
                      console.log('Domain unavailable:', domain);
                    }
                  }
                }
                
                // 3秒后自动尝试切换
                setTimeout(autoSwitch, 3000);
              </script>
            </body>
            </html>`,
            { 
              headers: { 
                'Content-Type': 'text/html; charset=utf-8' 
              },
              status: 200
            }
          );
        }
        
        // 对于其他资源，返回空响应而不是抛出错误
        return new Response('', { 
          status: 503, 
          statusText: 'Service Temporarily Unavailable' 
        });
      })
  );
});

// 消息处理
self.addEventListener('message', (event) => {
  // console.log('[SW] Received message:', event.data);
  
  try {
    if (event.data && event.data.type === 'SKIP_WAITING') {
      self.skipWaiting();
      return;
    }
    
    if (event.data && event.data.type === 'GET_VERSION') {
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({ version: APP_VERSION });
      }
      return;
    }
    
    if (event.data && event.data.type === 'CHECK_DOMAINS') {
      event.waitUntil(
        Promise.all(BACKUP_DOMAINS.map(async (domain) => {
          const available = await checkDomainAvailability(domain);
          return { domain, available };
        }))
        .then((results) => {
          if (event.ports && event.ports[0]) {
            event.ports[0].postMessage({ 
              type: 'DOMAIN_STATUS', 
              domains: results 
            });
          }
        })
        .catch(error => {
          console.error('[SW] Check domains error:', error);
          if (event.ports && event.ports[0]) {
            event.ports[0].postMessage({ 
              type: 'DOMAIN_STATUS', 
              error: error.message 
            });
          }
        })
      );
      return;
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
      event.waitUntil(
        caches.keys()
          .then(cacheNames => {
            // 同时清理域名状态缓存
            domainStatus.clear();
            return Promise.all(cacheNames.map(name => caches.delete(name)));
          })
          .then(() => {
            if (event.ports && event.ports[0]) {
              event.ports[0].postMessage({ success: true });
            }
          })
          .catch(error => {
            console.error('[SW] Clear cache error:', error);
            if (event.ports && event.ports[0]) {
              event.ports[0].postMessage({ success: false, error: error.message });
            }
          })
      );
      return;
    }
  } catch (error) {
    console.error('[SW] Message handling error:', error);
  }
});

// 错误处理
self.addEventListener('error', (event) => {
  console.error('[SW] Global error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled promise rejection:', event.reason);
  event.preventDefault(); // 防止错误传播到控制台
});

// console.log('[SW] Service Worker script loaded successfully');

module.exports = {
  apps: [
    {
      name: 'xmb-app-web',
      script: 'npx',
      args: 'serve dist -s -l 3006',
      cwd: process.env.HOME + '/work/xmb_app',
      autorestart: true,
      watch: false,
      max_memory_restart: '2G', // Mac生产环境：增加内存限制
      env: {
        NODE_ENV: 'development',
        PORT: 3006,
        PLATFORM: 'web'
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3006,
        PLATFORM: 'web'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3006,
        PLATFORM: 'web',
        // Mac生产环境优化
        UV_THREADPOOL_SIZE: 128,
        NODE_OPTIONS: '--max_old_space_size=4096'
      },
      env_test: {
        NODE_ENV: 'production',
        API_ENV: 'test',
        PORT: 3006,
        PLATFORM: 'web',
        // 测试环境配置
        UV_THREADPOOL_SIZE: 64,
        NODE_OPTIONS: '--max_old_space_size=2048'
      },
      // Mac生产环境日志配置
      error_file: process.env.HOME + '/logs/xmb/prod-err.log',
      out_file: process.env.HOME + '/logs/xmb/prod-out.log',
      log_file: process.env.HOME + '/logs/xmb/prod-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      log_type: 'json', // 生产环境使用JSON格式日志
      // 日志轮转配置
      log_rotate: true,
      max_size: '100M',
      retain: 10,
      // 生产环境自动重启条件
      min_uptime: '30s', // 生产环境：30秒稳定运行后才认为启动成功
      max_restarts: 3, // 生产环境：减少重启次数，避免频繁重启
      restart_delay: 5000, // 重启延迟5秒
      // 监控设置
      monitoring: true, // 生产环境启用监控
      // 进程管理
      kill_timeout: 10000, // 生产环境：增加kill超时时间
      wait_ready: true, // 等待应用准备就绪
      listen_timeout: 10000, // 监听超时时间
      // 健康检查
      health_check_grace_period: 3000
    },
    {
      name: 'chainalert-rn-dev',
      script: 'npx',
      args: 'expo start --web --port 8081',
      cwd: process.env.HOME + '/work/chainalert_rn',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'development',
        PORT: 8081,
        EXPO_DEVTOOLS_LISTEN_ADDRESS: '0.0.0.0'
      },
      // 开发环境日志
      error_file: process.env.HOME + '/logs/chainalert/dev-err.log',
      out_file: process.env.HOME + '/logs/chainalert/dev-out.log',
      log_file: process.env.HOME + '/logs/chainalert/dev-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // 开发环境重启条件
      min_uptime: '5s',
      max_restarts: 15,
      kill_timeout: 10000,
      wait_ready: false,
      listen_timeout: 10000
    }
  ],

  // 部署配置
  deploy: {
    development: {
      user: process.env.USER,
      host: 'localhost',
      ref: 'origin/main',
      repo: 'git@github.com:dingwenjun19861016/chainalert_rn.git',
      path: process.env.HOME + '/work/chainalert_rn',
      'pre-deploy-local': 'echo "准备部署到本地开发环境"',
      'post-deploy': 'npm install && npx expo export --platform web && pm2 reload ecosystem.config.js --env development',
      'pre-setup': 'mkdir -p ' + process.env.HOME + '/logs/chainalert'
    },
    production: {
      user: process.env.USER,
      host: ['localhost'], // Mac本地生产环境
      ref: 'origin/main',
      repo: 'git@github.com:dingwenjun19861016/chainalert_rn.git',
      path: process.env.HOME + '/production/chainalert_rn',
      'pre-deploy-local': 'echo "准备部署到Mac生产环境"',
      'post-deploy': 'npm ci --production && npx expo export --platform web --output-dir dist && pm2 reload ecosystem.config.js --env production && pm2 save',
      'pre-setup': 'mkdir -p ' + process.env.HOME + '/production/chainalert_rn && mkdir -p ' + process.env.HOME + '/logs/chainalert',
      // 生产环境健康检查
      'post-setup': 'pm2 install pm2-logrotate && pm2 set pm2-logrotate:max_size 100M && pm2 set pm2-logrotate:retain 10',
      // 环境变量
      env: {
        NODE_ENV: 'production',
        PORT: 3006
      }
    },
    staging: {
      user: process.env.USER,
      host: ['localhost'],
      ref: 'origin/develop',
      repo: 'git@github.com:dingwenjun19861016/chainalert_rn.git',
      path: process.env.HOME + '/staging/chainalert_rn',
      'pre-deploy-local': 'echo "准备部署到测试环境"',
      'post-deploy': 'npm install && npx expo export --platform web && pm2 reload ecosystem.config.js --env development',
      'pre-setup': 'mkdir -p ' + process.env.HOME + '/staging/chainalert_rn && mkdir -p ' + process.env.HOME + '/logs/chainalert'
    }
  }
};

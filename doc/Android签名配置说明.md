# Android签名配置说明

## 重要文件管理

为了确保团队成员能够正常构建生产APK，以下关键文件已加入Git管理：

### 🔑 签名文件
- `android/app/xmb-release.keystore` - 生产环境签名密钥库
- `credentials.json` - 密钥库配置信息

### 🌐 Google服务配置
- `android/app/google-services.json` - Google Services配置文件

## 关键信息

### Keystore详情
- **文件路径**: `android/app/xmb-release.keystore`
- **Store密码**: `xmbstock`
- **Key别名**: `xmb`
- **Key密码**: `xmbstock`
- **SHA1指纹**: `BF:35:39:D9:BD:21:8C:5C:74:6B:CE:CB:F6:4D:21:F4:1A:75:0B:83`

### Google Console配置
- **包名**: `com.xmb.app`
- **项目ID**: `chainalert-466902`
- **客户端ID**: `516014443439-hr7jrsbdi4e7srcr3d6nnqn6orkficrn.apps.googleusercontent.com`

## 构建生产APK

使用以下命令构建签名的生产APK：

```bash
./scripts/build-android.sh
```

## 安全注意事项

⚠️ **重要提醒**：
1. 这些文件包含敏感信息，仅在团队内部仓库中共享
2. 不要将keystore文件泄露给第三方
3. 如果keystore丢失，将无法更新已发布的应用
4. 定期备份keystore文件到安全位置

## 故障排除

如果遇到签名问题：
1. 确认keystore文件路径正确
2. 验证密码是否正确
3. 检查SHA1指纹是否与Google Console匹配
4. 运行 `./scripts/verify-apk.sh` 验证APK

## 更新记录

- **2025-08-19**: 重新生成生产keystore，更新Google Services配置
- **2025-08-19**: 将关键配置文件加入Git管理

# 腾讯云COS配置说明

## 1. 环境变量配置

在项目根目录创建 `.env` 文件，添加以下环境变量：

```
TENCENT_CLOUD_SECRET_ID=your_secret_id
TENCENT_CLOUD_SECRET_KEY=your_secret_key
PORT=3001
```

## 2. 启动服务端签名服务

```bash
# 开发环境
npm run dev

# 生产环境
npm start
```

## 3. 配置COS权限

确保腾讯云账号具有以下权限：

1. COS写入权限
2. 访问密钥管理权限

## 4. 域名配置

确保在微信公众平台配置以下域名：

- request合法域名: `http://localhost:3001` (开发环境)
- uploadFile合法域名: `https://jmrecipe-1309147067.cos.ap-shanghai.myqcloud.com/jmrecipe`

## 5. 使用说明

1. 启动服务端签名服务
2. 在小程序中选择图片
3. 图片将自动上传到COS存储桶
4. 上传成功后返回COS访问URL

## 6. 安全注意事项

1. 不要在前端代码中硬编码SECRET_ID和SECRET_KEY
2. 使用服务端签名或临时密钥
3. 定期轮换密钥
4. 限制COS存储桶访问权限
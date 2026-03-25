# zDrink POS 部署指南

## 目录

- [环境要求](#环境要求)
- [Web 应用部署](#web-应用部署)
- [Docker 部署](#docker-部署)
- [Electron 桌面应用](#electron-桌面应用)
- [移动端应用](#移动端应用)
- [CDN 配置](#cdn-配置)
- [环境变量说明](#环境变量说明)

---

## 环境要求

### 基础要求

- Node.js >= 18.0
- npm >= 9.0

### Web 服务器（可选）

- Nginx >= 1.20
- Apache >= 2.4
- Node.js 服务器（用于 standalone 模式）

### Docker（可选）

- Docker >= 20.0
- Docker Compose >= 2.0

### Electron 构建

- Windows: Windows 10/11
- macOS: macOS 10.15+
- Linux: Ubuntu 20.04+

### 移动端构建

- Android: Android Studio, Android SDK 30+
- iOS: Xcode 14+, macOS

---

## Web 应用部署

### 方式一：Standalone 模式（推荐）

1. **构建应用**

```bash
npm run build
```

2. **运行应用**

```bash
node .next/standalone/server.js
```

3. **配置环境变量**
   创建 `.env.production`:

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-production-secret-key
```

### 方式二：Nginx 部署

1. **构建应用**

```bash
npm run build
```

2. **配置 Nginx**

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /api/ {
        proxy_pass https://api.yourdomain.com;
        proxy_ssl_server_name on;
    }
}
```

3. **启动 Next.js 服务**

```bash
npm start
```

### 方式三：PM2 部署

1. **安装 PM2**

```bash
npm install -g pm2
```

2. **创建 ecosystem.config.js**

```javascript
module.exports = {
  apps: [{
    name: 'zdrink-pos',
    script: '.next/standalone/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
  }],
};
```

3. **启动应用**

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## Docker 部署

### 1. 创建 Dockerfile

在项目根目录创建 `frontend-v2/Dockerfile`:

```dockerfile
FROM node:18-alpine AS base

# 依赖安装阶段
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# 构建阶段
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# 生产运行阶段
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

### 2. 构建镜像

```bash
docker build -t zdrink-pos:latest .
```

### 3. 运行容器

```bash
docker run -d \
  -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=https://api.yourdomain.com \
  -e NEXTAUTH_SECRET=your-secret-key \
  --name zdrink-pos \
  zdrink-pos:latest
```

### 4. Docker Compose

创建 `docker-compose.yml`:

```yaml
version: '3.8'

services:
  zdrink-pos:
    build:
      context: ./frontend-v2
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=https://api.yourdomain.com
      - NEXTAUTH_URL=https://yourdomain.com
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
    restart: unless-stopped
    networks:
      - zdrink-network

networks:
  zdrink-network:
    driver: bridge
```

运行:

```bash
docker-compose up -d
```

---

## Electron 桌面应用

### 开发环境

```bash
npm run electron:dev
```

### 生产构建

#### Windows

```bash
npm run electron:build:win
```

#### macOS

```bash
npm run electron:build:mac
```

#### Linux

```bash
npm run electron:build:linux
```

构建产物在 `release/` 目录。

### 代码签名（可选）

#### Windows

配置 `electron-builder.json`:

```json
{
  "win": {
    "certificateSubjectName": "Your Company Name"
  }
}
```

#### macOS

需要 Apple Developer Certificate，使用 `notarize.js` 进行公证。

---

## 移动端应用

### Android

1. **同步代码**

```bash
npm run cap:sync:android
```

2. **打开 Android Studio**

```bash
npm run cap:open:android
```

3. **构建签名 APK**
    - 在 Android Studio 中：Build > Generate Signed Bundle / APK
    - 选择 APK
    - 创建或选择 Keystore
    - 选择 release 构建类型
    - 点击 Finish

4. **输出位置**
   `android/app/build/outputs/apk/release/app-release.apk`

### iOS

1. **同步代码**

```bash
npm run cap:sync:ios
```

2. **打开 Xcode**

```bash
npm run cap:open:ios
```

3. **配置签名**
    - 在 Xcode 中选择项目
    - Signing & Capabilities 标签
    - 选择 Team
    - 配置 Bundle Identifier

4. **构建 IPA**
    - Product > Archive
    - Distribute App
    - 选择发布方式（App Store / Ad Hoc）

---

## CDN 配置

### 1. 配置环境变量

在 `.env.production` 中添加:

```env
NEXT_PUBLIC_CDN_URL=https://cdn.yourdomain.com
```

### 2. Next.js 配置

已在 `next.config.ts` 中配置好图片域名白名单。

### 3. 上传静态资源

将以下目录上传到 CDN:

- `.next/static/` - Next.js 静态资源
- `public/` - 公共静态资源

### 4. 配置缓存策略

建议 CDN 缓存配置:

- `.next/static/*`: max-age=31536000 (1 年)
- `public/icons/*`: max-age=86400 (1 天)

---

## 环境变量说明

### 必需的环境变量

| 变量名                          | 说明              | 示例                           |
|------------------------------|-----------------|------------------------------|
| `NEXT_PUBLIC_API_URL`        | Django API 地址   | `https://api.yourdomain.com` |
| `NEXTAUTH_URL`               | NextAuth 回调 URL | `https://yourdomain.com`     |
| `NEXTAUTH_SECRET`            | NextAuth 密钥     | `随机生成的密钥`                    |
| `NEXT_PUBLIC_DEFAULT_TENANT` | 默认租户            | `default`                    |

### 可选的环境变量

| 变量名                        | 说明             | 示例                           |
|----------------------------|----------------|------------------------------|
| `NEXT_PUBLIC_CDN_URL`      | CDN 地址         | `https://cdn.yourdomain.com` |
| `NEXT_PUBLIC_DEBUG`        | 调试模式           | `true`                       |
| `GENERATE_SOURCEMAPS`      | 生成 source maps | `true`                       |
| `NEXT_PUBLIC_ANALYTICS_ID` | 分析工具 ID        | `GA-XXXXXXXXX`               |

### 生成 NEXTAUTH_SECRET

```bash
openssl rand -base64 32
# 或
node -e "console.log(require('crypto').randomBytes(32).toString('base64'));"
```

---

## 性能优化建议

1. **启用 Gzip/Brotli 压缩**
    - Nginx: 启用 gzip 或 brotli 模块
    - Apache: 启用 mod_deflate 或 mod_brotli

2. **配置 HTTP/2**
    - 升级服务器支持 HTTP/2
    - 配置 SSL/TLS

3. **启用缓存**
    - 浏览器缓存静态资源
    - 服务端缓存动态内容

4. **图片优化**
    - 使用 WebP/AVIF 格式
    - 响应式图片
    - 懒加载

5. **代码分割**
    - Next.js 自动处理
    - 按需加载大组件

---

## 监控和日志

### 应用监控

建议使用:

- Sentry - 错误追踪
- Google Analytics - 用户分析
- New Relic - 性能监控

### 日志收集

Standalone 模式的日志输出到 stdout/stderr，建议:

- 使用 PM2 管理日志
- 配置日志轮转
- 集成 ELK Stack 或类似方案

---

## 故障排查

### 常见问题

1. **端口被占用**

```bash
# 修改端口
PORT=3001 npm start
```

2. **内存不足**

```bash
# 增加 Node.js 内存限制
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

3. **构建失败**

```bash
# 清理缓存
rm -rf .next node_modules
npm install
npm run build
```

4. **CORS 错误**
    - 检查 Django CORS 配置
    - 确认 API URL 正确

---

## 安全建议

1. **生产环境必须使用 HTTPS**
2. **定期更新依赖**
3. **使用强密码保护密钥**
4. **启用 CSP (Content Security Policy)**
5. **定期备份数据**
6. **监控异常登录**

---

## 联系支持

如有问题，请联系技术支持团队或查看官方文档。

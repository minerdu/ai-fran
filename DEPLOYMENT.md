# AI-Franchise 部署说明

## 当前状态

- 前端与 API 路由可正常 `next build`
- 生产镜像使用 Next.js `standalone`
- 访问路径固定为 `/fran`
- 生产端口建议映射为 `3001 -> 3000`

## 部署前提

服务器需预装：

- Docker Engine
- Docker Compose Plugin
- Nginx

## 1. 准备环境变量

复制样例文件：

```bash
cp .env.production.example .env.production
```

至少需要填写：

- `POSTGRES_PASSWORD`
- `OPENAI_API_KEY`
- `NEXT_PUBLIC_BASE_URL`

`DATABASE_URL` 默认已经指向 Compose 内置的 PostgreSQL 容器，一般不需要改。

## 2. 启动应用

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

容器启动时会先执行：

```bash
npx prisma migrate deploy
```

再启动 Next.js 生产服务。

## 3. 配置 Nginx

将仓库内脚本上传到服务器后执行：

```bash
sudo bash ./scripts/nginx-setup.sh
```

该配置会把：

- `/fran/` 代理到 `127.0.0.1:3001`
- `/` 重定向到 `/fran/`

## 4. 验证

验证容器状态：

```bash
docker compose -f docker-compose.prod.yml ps
docker logs ai-franchise-app --tail 100
```

验证页面：

- `http://<server-ip>/fran/`
- `http://<server-ip>/fran/api/mobile/ai/home`

## 当前限制

- `ai-ops/ai-ops-app` 目录当前在本环境下权限受限，未纳入本次联动部署

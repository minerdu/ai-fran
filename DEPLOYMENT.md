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
- PostgreSQL 15+
- Nginx

## 1. 准备数据库

在服务器上执行：

```bash
cd /opt/ai-fran
DB_PASSWORD='change-me' APP_USER=ubuntu ./scripts/server-setup.sh
```

脚本会：

- 创建 PostgreSQL 用户和数据库
- 授权 `public` schema
- 创建应用目录
- 校验本地 PostgreSQL 连接

## 2. 准备环境变量

复制样例文件：

```bash
cp .env.production.example .env.production
```

至少需要填写：

- `DATABASE_URL`
- `OPENAI_API_KEY`
- `NEXT_PUBLIC_BASE_URL`

如果 PostgreSQL 部署在宿主机，容器内推荐使用：

```text
host.docker.internal
```

该主机名已在 `docker-compose.prod.yml` 中通过 `host-gateway` 注入。

## 3. 启动应用

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

容器启动时会先执行：

```bash
npx prisma migrate deploy
```

再启动 Next.js 生产服务。

## 4. 配置 Nginx

将仓库内脚本上传到服务器后执行：

```bash
sudo bash ./scripts/nginx-setup.sh
```

该配置会把：

- `/fran/` 代理到 `127.0.0.1:3001`
- `/` 重定向到 `/fran/`

## 5. 验证

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

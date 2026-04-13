## AI Agent 评估平台

当前仓库已经扩展为：

- React + Vite 前端
- FastAPI 后端
- Docker PostgreSQL 数据库
- Alembic 迁移
- Gemini + 工具型 Agent 执行链路

## 本地运行

### 1. 准备环境

- Node.js 20+
- Python 3.12+
- `uv`
- Docker Desktop

### 2. 安装依赖

```bash
npm install
uv sync
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env`，至少补齐这些值：

- `APP_SECRET_KEY`
- `GEMINI_API_KEY`
- `TAVILY_API_KEY`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `AWS_S3_BUCKET`

如果本地使用默认 Docker Postgres，可直接保留：

```env
DATABASE_URL=postgresql+psycopg://agenteval_app:agenteval_app@localhost:55432/agenteval
AGENT_DATABASE_URL=postgresql+psycopg://agenteval_agent:agenteval_agent@localhost:55432/agenteval
```

### 4. 启动 PostgreSQL

```bash
docker compose up -d
```

### 5. 执行数据库迁移

```bash
uv run alembic upgrade head
```

### 6. 启动后端

```bash
uv run uvicorn app.main:app --app-dir backend --reload --host 0.0.0.0 --port 8000
```

### 7. 启动前端

```bash
npm run dev
```

前端默认运行在 `http://localhost:3000`，并通过 Vite 代理把 `/api` 请求转发到 `http://localhost:8000`。

## 默认种子数据

首次启动后会自动写入：

- 邀请码：`INV-DEMO-2026`
- 2 个默认评测集
- 默认 Agent Profile 模板

## 生产构建

前端打包：

```bash
npm run build
```

打包完成后，FastAPI 会优先托管根目录 `dist/` 下的静态资源。

## 测试与校验

前端类型检查：

```bash
npm run lint
```

后端测试：

```bash
uv run pytest
```

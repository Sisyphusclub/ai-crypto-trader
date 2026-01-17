# AI 加密货币交易系统 (MVP)

自托管的 AI 驱动加密货币永续合约交易平台，供个人使用。

## 环境要求

- Docker & Docker Compose
- Node.js 20+
- Python 3.12+

## 快速开始

### 方式一：Docker Compose（推荐）

```bash
# 1. 复制并配置环境变量
cp .env.example .env

# 2. 生成强密钥（必须）
# 将 .env 中的 JWT_SECRET 和 MASTER_KEY 替换为：
openssl rand -hex 32

# 3. 启动所有服务
docker compose up -d

# 4. 运行数据库迁移
docker compose exec server alembic upgrade head
```

### 方式二：本地开发

```bash
# 1. 复制并配置环境变量
cp .env.example .env
# 编辑 .env，设置强 JWT_SECRET 和 MASTER_KEY

# 2. 启动基础设施
docker compose up -d postgres redis

# 3. 启动后端（终端 1）
cd server
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000

# 4. 启动 Worker（终端 2）
cd worker
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m worker.main

# 5. 启动前端（终端 3）
cd web
npm install
npm run dev
```

## 访问地址

| 服务 | 地址 |
|------|------|
| Web 界面 | http://localhost:3000 |
| API 文档 (OpenAPI) | http://localhost:8000/docs |
| API 文档 (ReDoc) | http://localhost:8000/redoc |
| 健康检查 | http://localhost:8000/health |

## 环境变量

| 变量 | 必需 | 说明 |
|------|------|------|
| `JWT_SECRET` | **是** | JWT 签名密钥（至少 32 字符）。使用 `openssl rand -hex 32` 生成 |
| `MASTER_KEY` | **是** | 密钥加密主密钥（至少 32 字符）。使用 `openssl rand -hex 32` 生成 |
| `APP_ENV` | 否 | 环境名称（默认：`dev`） |
| `DATABASE_URL` | 是 | PostgreSQL 连接字符串 |
| `REDIS_URL` | 是 | Redis 连接字符串 |
| `PAPER_TRADING` | 否 | 启用模拟交易模式（默认：`true`） |
| `NEXT_PUBLIC_API_URL` | 否 | 前端使用的后端 API 地址（默认：`http://localhost:8000`） |

## 安全要求

### 密钥管理

- **服务拒绝使用弱/默认密钥启动。** 必须为 `JWT_SECRET` 和 `MASTER_KEY` 设置强密钥。
- **API 密钥使用 AES-256-GCM 加密存储。**
- **API 接口永不返回完整密钥。** 仅显示脱敏值（如 `sk-a***xyz`）。
- **日志永不包含敏感数据。** 所有敏感字段在记录日志前被过滤。

### 交易所 API 密钥

- 使用 **不带提现权限** 的交易所 API 密钥。
- 尽可能在交易所启用 **IP 白名单**。
- 密钥加密存储，永不通过 API 暴露。

### 生成强密钥

```bash
# 生成 32 字节十六进制密钥
openssl rand -hex 32

# 或使用 Python
python -c "import secrets; print(secrets.token_hex(32))"
```

## 数据库迁移

```bash
# 运行迁移
cd server
alembic upgrade head

# 创建新迁移
alembic revision --autogenerate -m "描述"

# 回滚
alembic downgrade -1
```

## API 接口

### 健康检查
- `GET /health` - 系统健康检查（数据库、Redis 状态）

### 交易所配置
- `POST /api/v1/exchanges` - 创建交易所账户
- `GET /api/v1/exchanges` - 获取交易所账户列表（密钥脱敏）
- `GET /api/v1/exchanges/{id}` - 获取单个交易所账户
- `PUT /api/v1/exchanges/{id}` - 更新交易所账户
- `DELETE /api/v1/exchanges/{id}` - 删除交易所账户

### AI 模型配置
- `POST /api/v1/models` - 创建模型配置
- `GET /api/v1/models` - 获取模型配置列表（密钥脱敏）
- `GET /api/v1/models/{id}` - 获取单个模型配置
- `PUT /api/v1/models/{id}` - 更新模型配置
- `DELETE /api/v1/models/{id}` - 删除模型配置

### 任务队列
- `POST /api/v1/tasks/ping` - 入队演示 ping 任务
- `GET /api/v1/tasks/{task_id}` - 获取任务状态

### 交易接口
- `POST /api/v1/trade/preview` - 交易预览（保证金、风险提示）
- `POST /api/v1/trade/execute` - 执行交易计划
- `GET /api/v1/trade/positions` - 获取持仓列表
- `GET /api/v1/trade/orders` - 获取挂单列表
- `GET /api/v1/trade/plans` - 获取交易计划列表
- `GET /api/v1/trade/plans/{id}` - 获取交易计划详情

## 项目结构

```
ai-crypto-trader/
├── server/          # FastAPI 后端
│   ├── app/
│   │   ├── adapters/  # 交易所适配器 (Binance, Gate)
│   │   ├── api/       # API 路由
│   │   ├── core/      # 配置、加密、数据库
│   │   └── models/    # SQLAlchemy 模型
│   ├── migrations/    # Alembic 迁移
│   └── tests/         # 单元测试
├── worker/          # RQ 后台任务
│   └── worker/
│       └── tasks/   # 任务定义
├── web/             # Next.js 前端
│   └── app/
│       └── components/
├── docs/            # 文档
└── docker-compose.yml
```

## 当前进度：里程碑 2 完成

### 里程碑 1（已完成）
- [x] Monorepo 结构 (web/server/worker)
- [x] Docker Compose 健康检查
- [x] FastAPI + OpenAPI 文档
- [x] AES-256-GCM 密钥加密
- [x] 启动安全检查（拒绝弱密钥）
- [x] Alembic 数据库迁移
- [x] 交易所配置 CRUD (binance/gate)
- [x] AI 模型配置 CRUD (openai/anthropic/google)
- [x] RQ Worker + 演示任务
- [x] Next.js 前端健康状态显示

### 里程碑 2（已完成）
- [x] ExchangeAdapter 抽象基类
- [x] BinanceAdapter（USDT 永续合约）
- [x] GateAdapter（USDT 永续合约）
- [x] 交易 API：预览、执行、持仓、订单
- [x] 状态机：入场 → TP/SL → 完成/失败
- [x] 模拟交易模式 + confirm 安全确认
- [x] client_order_id 幂等性
- [x] 数量/价格精度处理

## 下一步：里程碑 3 - 策略工作室

详见 `docs/TASKS.md` 完整路线图。

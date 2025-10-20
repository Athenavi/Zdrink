# Zdrink - 智能餐饮点餐系统

## 📖 项目简介

Zdrink是一个功能完善的餐饮点餐管理系统，支持堂食、外卖、自取等多种服务模式。系统采用前后端分离架构，基于多租户设计，适用于咖啡厅、餐厅、酒吧、烘焙店等多种餐饮场景。

## ✨ 核心特性

### 🏪 多租户架构
- 支持多店铺独立运营，数据隔离
- 每个店铺拥有独立的PostgreSQL Schema

### 📱 多场景订餐
- **堂食**：扫码点餐，支持桌台管理
- **自取**：在线下单，到店取餐
- **外卖**：配送服务，支持配送费和配送范围设置

### 🛍️ 商品管理
- 商品分类管理，支持多级分类
- SKU管理，支持多规格商品
- 商品属性定制（如温度、甜度、辣度等）
- 库存管理及库存变更日志

### 📋 订单系统
- 完整的订单生命周期管理（待支付→已支付→制作中→已完成）
- 订单状态追踪和日志记录
- 购物车功能

### 💰 支付系统
- 支持多种支付方式（微信、支付宝、现金、银行卡、余额）
- 支付状态跟踪和退款处理 

### 🎫 营销系统
- 优惠券管理（固定金额、百分比折扣、免运费）
- 促销活动（折扣、赠品、套餐、限时抢购）
- 自动发券规则（注册发放、首单发放、生日发放）

### 🍽️ 桌台管理
- 桌台状态管理（空闲、占用、预订、清洁中、维护中）
- 二维码扫码点餐
- 桌台容量和类型配置

### 👥 用户与权限
- 店铺员工角色管理（店主、店长、员工、收银员）
- JWT身份认证
- 基于角色的权限控制

## 🏗️ 技术架构

### 后端技术栈
- **框架**: Django + Django REST Framework
- **数据库**: PostgreSQL (支持多租户)
- **认证**: JWT (Simple JWT)
- **API文档**: drf-spectacular (Swagger/OpenAPI)
- **多租户**: django-tenants

### 前端技术栈
- **框架**: Vue 3
- **构建工具**: Vite
- **UI组件**: Vant 4 (移动端优先)
- **状态管理**: Pinia
- **路由**: Vue Router

## 📦 安装部署

### 环境要求
- Python 3.13.2+
- Node.js 24.5.0+
- PostgreSQL 17.4+

### 后端部署

1. **克隆项目**
```bash
git clone https://github.com/Athenavi/Zdrink.git
cd Zdrink/backend
```

2. **创建虚拟环境**
```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

3. **安装依赖**
```bash
pip install -r requirements.txt
```

4. **配置环境变量**
创建 `.env` 文件：
```env
SECRET_KEY=your-secret-key
DEBUG=True
DB_NAME=zdrink
DB_USER=postgres
DB_PASSWORD=your-password
DB_HOST=localhost
DB_PORT=5432
```

5. **数据库迁移**
```bash
python manage.py migrate_schemas --shared
python manage.py migrate_schemas
```

6. **创建超级用户**
```bash
python manage.py createsuperuser
```

7. **运行开发服务器**
```bash
python manage.py runserver 0.0.0.0:8000
```

### 前端部署

1. **进入前端目录**
```bash
cd Zdrink/frontend
```

2. **安装依赖**
```bash
npm install
```

3. **运行开发服务器**
```bash
npm run dev
```

访问 `http://localhost:3000` 即可使用系统。

## 🔗 API文档

系统启动后，可以访问以下地址查看API文档：

- Swagger UI: `/api/docs/`
- ReDoc: `/api/redoc/`
- OpenAPI Schema: `/api/schema/`

## 📱 功能模块

### 用户端功能
- 用户注册与登录
- 浏览店铺和菜单
- 商品详情查看
- 购物车管理
- 订单创建与支付
- 订单历史查询
- 个人中心

### 商家端功能
- 店铺信息管理
- 商品和分类管理
- 订单处理
- 桌台管理
- 促销活动管理
- 数据统计分析

## 🔐 安全配置

- CORS跨域配置 
- JWT令牌有效期配置（访问令牌1天，刷新令牌7天 
- 路由守卫和身份验证

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来帮助改进项目！
如有问题或建议，请通过 GitHub Issues 联系我们。

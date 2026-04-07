# Debug 目录说明

本目录包含支付系统的调试工具和示例代码。

## 文件说明

### 1. payment_debug_tool.py（主要工具）

**支付系统统一调试工具** - 整合了所有支付相关的调试、检查和测试功能

#### 使用方法

```bash
cd backend
python debug/payment_debug_tool.py
```

#### 功能列表

- **check_alipay** - 检查支付宝配置
- **fix_alipay_keys** - 修复支付宝密钥格式
- **test_sandbox** - 测试支付宝沙箱环境
- **create_methods** - 创建支付方式（微信、支付宝、现金）
- **check_order** - 检查订单状态
- **test_integration** - 完整的支付集成测试

#### 使用示例

```bash
# 启动工具后会提示选择店铺
python debug/payment_debug_tool.py

# 然后在交互界面中输入命令
> check_alipay      # 检查支付宝配置
> fix_alipay_keys   # 修复密钥格式
> test_sandbox      # 测试沙箱
> check_order 14    # 检查订单#14
> test_integration  # 完整集成测试
> help              # 查看帮助
> quit              # 退出
```

### 2. setup_payment_config.py

**支付配置初始化脚本** - 用于为新店铺配置微信支付和支付宝

#### 使用方法

```bash
cd backend
python debug/setup_payment_config.py
```

该脚本会引导你：

1. 选择要配置的店铺
2. 输入微信支付配置信息（AppID、商户号、证书等）
3. 输入支付宝配置信息（AppID、私钥、公钥等）
4. 自动创建对应的支付方式记录

### 3. payment_examples.py

**支付功能使用示例** - 演示如何使用支付API的示例代码

包含以下示例：

- 微信扫码支付完整流程
- 支付宝WAP支付
- 退款操作
- 支付统计查询
- 前端JavaScript调用示例

## 迁移说明

以下旧脚本已被整合到 `payment_debug_tool.py` 中：

| 旧脚本                         | 新命令                  |
|-----------------------------|----------------------|
| check_alipay_config.py      | `check_alipay`       |
| check_order.py              | `check_order`        |
| check_sandbox_config.py     | `check_alipay` (已整合) |
| create_payment_methods.py   | `create_methods`     |
| fix_alipay_keys.py          | `fix_alipay_keys`    |
| setup_alipay_sandbox.py     | `test_sandbox`       |
| test_alipay_sandbox.py      | `test_sandbox`       |
| test_payment_api.py         | `test_integration`   |
| test_payment_integration.py | `test_integration`   |

## 常见问题

### Q: 如何快速检查支付宝配置？

A: 运行 `python debug/payment_debug_tool.py`，然后输入 `check_alipay`

### Q: 密钥格式错误怎么办？

A: 运行工具后输入 `fix_alipay_keys` 自动修复

### Q: 如何测试沙箱环境？

A: 确保已配置沙箱AppID，然后运行 `test_sandbox` 命令

### Q: 如何为新店铺配置支付？

A: 使用 `setup_payment_config.py` 脚本进行交互式配置

## 注意事项

1. 所有脚本都需要在 `backend` 目录下执行
2. 确保Django环境已正确设置
3. 沙箱测试需要使用沙箱环境的AppID和密钥
4. 生产环境配置请确保使用HTTPS回调URL

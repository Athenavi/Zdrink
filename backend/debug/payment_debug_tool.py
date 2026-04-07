"""
支付系统统一调试工具
整合了所有支付相关的调试、检查和测试功能
"""
import os
import sys

import django

# 设置Django环境
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zdrink_core.settings')
django.setup()

from django_tenants.utils import schema_context
from apps.shops.models import Shop
from apps.payments.models import PaymentMethod, WechatPayConfig, AlipayConfig
from apps.orders.models import Order


def format_key(key, key_type='private'):
    """格式化密钥为正确的PEM格式"""
    if not key:
        return key

    # 移除现有的头尾标记和空白
    markers = [
        '-----BEGIN RSA PRIVATE KEY-----',
        '-----END RSA PRIVATE KEY-----',
        '-----BEGIN PRIVATE KEY-----',
        '-----END PRIVATE KEY-----',
        '-----BEGIN PUBLIC KEY-----',
        '-----END PUBLIC KEY-----'
    ]
    for marker in markers:
        key = key.replace(marker, '')
    key = key.replace('\n', '').replace('\r', '').replace(' ', '')

    # 添加标准的PEM头尾
    if key_type == 'private':
        formatted = '-----BEGIN RSA PRIVATE KEY-----\n'
        end_marker = '-----END RSA PRIVATE KEY-----'
    else:
        formatted = '-----BEGIN PUBLIC KEY-----\n'
        end_marker = '-----END PUBLIC KEY-----'

    # 每64个字符换行
    for i in range(0, len(key), 64):
        formatted += key[i:i + 64] + '\n'
    formatted += end_marker

    return formatted


def check_shop_selection():
    """选择要操作的店铺"""
    shops = Shop.objects.all()

    if not shops.exists():
        print("❌ 没有找到任何店铺")
        return None

    print("\n可用店铺:")
    for i, shop in enumerate(shops, 1):
        print(f"  {i}. {shop.name} (ID: {shop.id}, Schema: {shop.schema_name})")

    try:
        choice = input("\n请选择店铺编号 (默认1): ").strip()
        shop_idx = int(choice) - 1 if choice else 0

        if 0 <= shop_idx < len(shops):
            return shops[shop_idx]
        else:
            print("❌ 无效的店铺编号")
            return None
    except ValueError:
        print("❌ 请输入有效的数字")
        return None


def check_alipay_config(shop):
    """检查支付宝配置"""
    print("\n" + "=" * 60)
    print("支付宝配置检查")
    print("=" * 60)

    with schema_context(shop.schema_name):
        try:
            config = AlipayConfig.objects.get(shop=shop)

            print(f"\n当前配置:")
            print(f"  AppID: {config.app_id}")
            print(f"  私钥长度: {len(config.app_private_key) if config.app_private_key else 0}")
            print(f"  公钥长度: {len(config.alipay_public_key) if config.alipay_public_key else 0}")
            print(f"  是否启用: {'✓' if config.is_active else '✗'}")

            # 检查是否为沙箱AppID
            is_sandbox_appid = config.app_id.startswith('9021') or config.app_id.startswith('20210001')
            print(f"  AppID类型: {'沙箱环境' if is_sandbox_appid else '正式环境'}")

            # 检查密钥格式
            issues = []
            if config.app_private_key and not config.app_private_key.startswith('-----BEGIN'):
                issues.append("私钥格式不正确（应以 -----BEGIN RSA PRIVATE KEY----- 开头）")

            if config.alipay_public_key and not config.alipay_public_key.startswith('-----BEGIN'):
                issues.append("公钥格式不正确（应以 -----BEGIN PUBLIC KEY----- 开头）")

            if issues:
                print("\n⚠️  发现的问题:")
                for issue in issues:
                    print(f"  - {issue}")
                return False
            else:
                print("\n✓ 配置检查通过")
                return True

        except AlipayConfig.DoesNotExist:
            print("\n❌ 支付宝配置不存在")
            print("  请在Django Admin中创建配置:")
            print(f"  http://localhost:8000/admin/payments/alipayconfig/add/")
            return False


def fix_alipay_keys(shop):
    """修复支付宝密钥格式"""
    print("\n" + "=" * 60)
    print("修复支付宝密钥格式")
    print("=" * 60)

    with schema_context(shop.schema_name):
        try:
            config = AlipayConfig.objects.get(shop=shop)

            print('\n修复前的配置:')
            print(f'  私钥前50字符: {config.app_private_key[:50] if config.app_private_key else "None"}...')
            print(f'  公钥前50字符: {config.alipay_public_key[:50] if config.alipay_public_key else "None"}...')

            # 格式化密钥
            formatted_private_key = format_key(config.app_private_key, 'private')
            formatted_public_key = format_key(config.alipay_public_key, 'public')

            print('\n修复后的配置:')
            print(f'  私钥前50字符: {formatted_private_key[:50]}...')
            print(f'  公钥前50字符: {formatted_public_key[:50]}...')

            confirm = input("\n是否应用修复? (y/n): ").strip().lower()
            if confirm == 'y':
                config.app_private_key = formatted_private_key
                config.alipay_public_key = formatted_public_key
                config.save()
                print('\n✓ 密钥格式已修复！')

                # 测试初始化
                print('\n测试支付宝SDK初始化...')
                try:
                    from alipay import AliPay
                    is_sandbox = config.app_id.startswith('9021') or config.app_id.startswith('20210001')
                    alipay = AliPay(
                        appid=config.app_id,
                        app_notify_url='https://yourdomain.com/api/payments/callback/alipay/',
                        app_private_key_string=config.app_private_key,
                        alipay_public_key_string=config.alipay_public_key,
                        sign_type="RSA2",
                        debug=is_sandbox
                    )
                    print('✓ 支付宝SDK初始化成功！')
                    return True
                except Exception as e:
                    print(f'❌ 支付宝SDK初始化失败: {e}')
                    return False
            else:
                print('\n已取消修复')
                return False

        except AlipayConfig.DoesNotExist:
            print('❌ 支付宝配置不存在')
            return False


def test_alipay_sandbox(shop):
    """测试支付宝沙箱配置"""
    print("\n" + "=" * 60)
    print("支付宝沙箱支付测试")
    print("=" * 60)

    with schema_context(shop.schema_name):
        try:
            # 获取配置
            config = AlipayConfig.objects.get(shop=shop)
            print(f"\n1. 配置信息:")
            print(f"   AppID: {config.app_id}")
            print(f"   是否启用: {'✓' if config.is_active else '✗'}")

            # 获取最新订单
            order = Order.objects.order_by('-id').first()
            if not order:
                print("   ❌ 没有找到订单")
                return False

            print(f"\n2. 订单信息:")
            print(f"   订单号: {order.order_number}")
            print(f"   金额: ¥{order.total_amount}")
            print(f"   状态: {order.status}")

            # 测试初始化
            print(f"\n3. 测试支付宝SDK初始化...")
            from alipay import AliPay

            is_sandbox = config.app_id.startswith('9021') or config.app_id.startswith('20210001')
            print(f"   环境: {'沙箱' if is_sandbox else '正式'}")

            alipay = AliPay(
                appid=config.app_id,
                app_notify_url='https://yourdomain.com/api/payments/callback/alipay/',
                app_private_key_string=config.app_private_key,
                alipay_public_key_string=config.alipay_public_key,
                sign_type="RSA2",
                debug=is_sandbox
            )

            # 设置沙箱网关
            if is_sandbox:
                alipay._gateway = "https://openapi-sandbox.dl.alipaydev.com/gateway.do"
                print(f"   网关: {alipay._gateway}")

            print(f"   ✓ SDK初始化成功")

            # 测试生成支付链接
            print(f"\n4. 测试生成WAP支付链接...")
            order_string = alipay.api_alipay_trade_wap_pay(
                out_trade_no=order.order_number,
                total_amount=str(order.total_amount),
                subject=f"订单{order.order_number}",
                return_url='https://yourdomain.com/payment/result/',
                notify_url='https://yourdomain.com/api/payments/callback/alipay/'
            )

            pay_url = f"{alipay._gateway}?{order_string}"
            print(f"   ✓ 支付链接生成成功")
            print(f"   链接长度: {len(pay_url)} 字符")
            print(f"   链接预览: {pay_url[:100]}...")

            print("\n" + "=" * 60)
            print("✓ 所有测试通过！支付宝沙箱配置正确")
            print("=" * 60)
            print("\n现在可以在浏览器中测试支付了")
            print(f"访问: http://localhost:3000/order/{order.id}/pay?method=alipay")
            return True

        except Exception as e:
            print(f"\n❌ 测试失败: {e}")
            import traceback
            traceback.print_exc()
            return False


def create_payment_methods(shop):
    """创建支付方式"""
    print("\n" + "=" * 60)
    print("创建支付方式")
    print("=" * 60)

    with schema_context(shop.schema_name):
        methods = [
            {'code': 'wechat', 'name': '微信支付'},
            {'code': 'alipay', 'name': '支付宝'},
            {'code': 'cash', 'name': '现金支付'}
        ]

        for m in methods:
            pm, created = PaymentMethod.objects.get_or_create(
                shop=shop,
                code=m['code'],
                defaults={'name': m['name'], 'is_active': True}
            )
            status = "创建" if created else "已存在"
            print(f'  {status}: {m["name"]} (ID={pm.id})')

        # 显示所有支付方式
        all_methods = PaymentMethod.objects.filter(shop=shop)
        print(f'\n共有 {all_methods.count()} 个支付方式:')
        for pm in all_methods:
            print(f'  - ID={pm.id}, Code={pm.code}, Name={pm.name}, Active={pm.is_active}')

        print('\n✓ 支付方式配置完成！')
        return True


def check_order(shop, order_id=None):
    """检查订单状态"""
    print("\n" + "=" * 60)
    print("订单检查")
    print("=" * 60)

    with schema_context(shop.schema_name):
        if order_id:
            try:
                order = Order.objects.get(id=order_id)
                orders = [order]
            except Order.DoesNotExist:
                print(f'❌ 订单 #{order_id} 不存在')
                return False
        else:
            # 显示最近的订单
            orders = Order.objects.all().order_by('-id')[:5]

        if not orders:
            print('❌ 没有找到订单')
            return False

        for order in orders:
            print(f'\n订单 #{order.id}:')
            print(f'  订单号: {order.order_number}')
            print(f'  状态: {order.status}')
            print(f'  支付状态: {order.payment_status}')
            print(f'  总金额: ¥{order.total_amount}')
            print(f'  所属店铺ID: {order.shop_id}')

        return True


def test_payment_integration(shop):
    """测试支付集成"""
    print("\n" + "=" * 60)
    print("支付集成测试")
    print("=" * 60)

    results = []

    # 测试支付方式配置
    print("\n1. 测试支付方式配置...")
    with schema_context(shop.schema_name):
        methods = PaymentMethod.objects.filter(shop=shop)
        if methods.exists():
            print(f"  ✓ 找到 {methods.count()} 个支付方式")
            for method in methods:
                status_icon = "✓" if method.is_active else "✗"
                print(f"    {status_icon} {method.name} ({method.code})")
            results.append(("支付方式配置", True))
        else:
            print("  ⚠ 未配置任何支付方式")
            results.append(("支付方式配置", False))

    # 测试微信支付配置
    print("\n2. 测试微信支付配置...")
    wechat_configs = WechatPayConfig.objects.filter(shop=shop, is_active=True)
    if wechat_configs.exists():
        for config in wechat_configs:
            print(f"  AppID: {config.app_id}")
            print(f"  商户号: {config.mch_id}")
            if config.cert_path and os.path.exists(config.cert_path):
                print(f"  ✓ 证书文件存在")
                results.append(("微信支付配置", True))
            else:
                print(f"  ❌ 证书文件不存在")
                results.append(("微信支付配置", False))
    else:
        print("  ⚠ 未配置微信支付")
        results.append(("微信支付配置", False))

    # 测试支付宝配置
    print("\n3. 测试支付宝配置...")
    with schema_context(shop.schema_name):
        alipay_configs = AlipayConfig.objects.filter(shop=shop, is_active=True)
        if alipay_configs.exists():
            for config in alipay_configs:
                print(f"  AppID: {config.app_id}")
                is_sandbox = config.app_id.startswith('9021') or config.app_id.startswith('20210001')
                print(f"  环境: {'沙箱' if is_sandbox else '正式'}")

                # 尝试初始化SDK
                try:
                    from alipay import AliPay
                    alipay = AliPay(
                        appid=config.app_id,
                        app_notify_url='https://yourdomain.com/api/payments/callback/alipay/',
                        app_private_key_string=config.app_private_key,
                        alipay_public_key_string=config.alipay_public_key,
                        sign_type="RSA2",
                        debug=is_sandbox
                    )
                    print(f"  ✓ 支付宝SDK初始化成功")
                    results.append(("支付宝配置", True))
                except Exception as e:
                    print(f"  ❌ 支付宝SDK初始化失败: {e}")
                    results.append(("支付宝配置", False))
        else:
            print("  ⚠ 未配置支付宝")
            results.append(("支付宝配置", False))

    # 汇总结果
    print("\n" + "=" * 60)
    print("测试汇总")
    print("=" * 60)

    for test_name, result in results:
        status = "✓ 通过" if result else "❌ 失败"
        print(f"{test_name}: {status}")

    all_passed = all(result for _, result in results)

    if all_passed:
        print("\n🎉 所有测试通过！支付系统已就绪。")
    else:
        print("\n⚠ 部分测试未通过，请检查配置。")

    return all_passed


def show_help():
    """显示帮助信息"""
    print("\n" + "=" * 60)
    print("支付系统调试工具 - 帮助")
    print("=" * 60)
    print("\n可用命令:")
    print("  1. check_alipay     - 检查支付宝配置")
    print("  2. fix_alipay_keys  - 修复支付宝密钥格式")
    print("  3. test_sandbox     - 测试支付宝沙箱")
    print("  4. create_methods   - 创建支付方式")
    print("  5. check_order      - 检查订单状态")
    print("  6. test_integration - 测试支付集成")
    print("  7. help             - 显示此帮助信息")
    print("  8. quit/exit        - 退出程序")
    print("\n示例:")
    print("  > check_alipay      # 检查当前店铺的支付宝配置")
    print("  > fix_alipay_keys   # 修复当前店铺的支付宝密钥")
    print("  > check_order 14    # 检查订单#14的状态")
    print("=" * 60)


def main():
    """主函数"""
    print("=" * 60)
    print("支付系统统一调试工具")
    print("=" * 60)

    # 选择店铺
    shop = check_shop_selection()
    if not shop:
        return

    print(f"\n已选择店铺: {shop.name}")

    # 交互模式
    while True:
        print("\n" + "-" * 60)
        try:
            command = input("\n请输入命令 (输入 'help' 查看帮助): ").strip().lower()

            if command in ['quit', 'exit', 'q']:
                print("\n再见！")
                break
            elif command in ['help', 'h', '?']:
                show_help()
            elif command == 'check_alipay':
                check_alipay_config(shop)
            elif command == 'fix_alipay_keys':
                fix_alipay_keys(shop)
            elif command == 'test_sandbox':
                test_alipay_sandbox(shop)
            elif command == 'create_methods':
                create_payment_methods(shop)
            elif command == 'check_order':
                order_id = input("请输入订单ID (留空查看最近5个订单): ").strip()
                check_order(shop, int(order_id) if order_id else None)
            elif command == 'test_integration':
                test_payment_integration(shop)
            else:
                print(f"❌ 未知命令: {command}")
                print("输入 'help' 查看可用命令")

        except KeyboardInterrupt:
            print("\n\n再见！")
            break
        except Exception as e:
            print(f"\n❌ 错误: {e}")
            import traceback
            traceback.print_exc()


if __name__ == '__main__':
    main()

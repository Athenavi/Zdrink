"""
支付配置初始化脚本
用于为店铺配置微信支付和支付宝
"""
import os
import sys

import django

# 设置Django环境
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zdrink_core.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.shops.models import Shop
from apps.payments.models import PaymentMethod, WechatPayConfig, AlipayConfig

User = get_user_model()


def setup_wechat_pay(shop, config_data):
    """配置微信支付"""
    print(f"\n为店铺 '{shop.name}' 配置微信支付...")

    # 创建或更新微信支付配置
    wechat_config, created = WechatPayConfig.objects.update_or_create(
        shop=shop,
        defaults={
            'app_id': config_data['app_id'],
            'mch_id': config_data['mch_id'],
            'api_key': config_data['api_key'],
            'cert_path': config_data.get('cert_path', ''),
            'key_path': config_data.get('key_path', ''),
            'notify_url': config_data.get('notify_url', ''),
            'is_active': config_data.get('is_active', True),
        }
    )

    # 创建支付方式
    payment_method, pm_created = PaymentMethod.objects.update_or_create(
        shop=shop,
        code='wechat',
        defaults={
            'name': '微信支付',
            'is_active': True,
            'sort_order': 1,
            'config': {
                'cert_serial_no': config_data.get('cert_serial_no', ''),
            }
        }
    )

    status = "创建" if created else "更新"
    print(f"✓ 微信支付配置{status}成功")
    print(f"  - AppID: {config_data['app_id']}")
    print(f"  - 商户号: {config_data['mch_id']}")

    return wechat_config, payment_method


def setup_alipay(shop, config_data):
    """配置支付宝"""
    print(f"\n为店铺 '{shop.name}' 配置支付宝...")

    # 创建或更新支付宝配置
    alipay_config, created = AlipayConfig.objects.update_or_create(
        shop=shop,
        defaults={
            'app_id': config_data['app_id'],
            'app_private_key': config_data['app_private_key'],
            'alipay_public_key': config_data['alipay_public_key'],
            'notify_url': config_data.get('notify_url', ''),
            'return_url': config_data.get('return_url', ''),
            'is_active': config_data.get('is_active', True),
        }
    )

    # 创建支付方式
    payment_method, pm_created = PaymentMethod.objects.update_or_create(
        shop=shop,
        code='alipay',
        defaults={
            'name': '支付宝',
            'is_active': True,
            'sort_order': 2,
            'config': {}
        }
    )

    status = "创建" if created else "更新"
    print(f"✓ 支付宝配置{status}成功")
    print(f"  - AppID: {config_data['app_id']}")

    return alipay_config, payment_method


def setup_cash_payment(shop):
    """配置现金支付"""
    print(f"\n为店铺 '{shop.name}' 配置现金支付...")

    payment_method, created = PaymentMethod.objects.update_or_create(
        shop=shop,
        code='cash',
        defaults={
            'name': '现金支付',
            'is_active': True,
            'sort_order': 3,
            'config': {}
        }
    )

    status = "创建" if created else "更新"
    print(f"✓ 现金支付配置{status}成功")

    return payment_method


def main():
    """主函数"""
    print("=" * 60)
    print("支付配置初始化工具")
    print("=" * 60)

    # 获取所有店铺
    shops = Shop.objects.all()

    if not shops.exists():
        print("\n❌ 没有找到任何店铺，请先创建店铺")
        return

    print(f"\n找到 {shops.count()} 个店铺:")
    for i, shop in enumerate(shops, 1):
        print(f"  {i}. {shop.name} (ID: {shop.id})")

    # 选择店铺
    try:
        shop_choice = input("\n请选择要配置的店铺编号 (直接回车配置所有店铺): ").strip()

        if shop_choice:
            shop_idx = int(shop_choice) - 1
            if 0 <= shop_idx < len(shops):
                selected_shops = [shops[shop_idx]]
            else:
                print("❌ 无效的店铺编号")
                return
        else:
            selected_shops = list(shops)
    except ValueError:
        print("❌ 请输入有效的数字")
        return

    # 配置每个选中的店铺
    for shop in selected_shops:
        print(f"\n{'=' * 60}")
        print(f"配置店铺: {shop.name}")
        print(f"{'=' * 60}")

        # 配置微信支付
        wechat_choice = input("\n是否配置微信支付? (y/n): ").strip().lower()
        if wechat_choice == 'y':
            print("\n请输入微信支付配置信息:")
            wechat_config = {
                'app_id': input("  AppID: ").strip(),
                'mch_id': input("  商户号: ").strip(),
                'api_key': input("  API密钥 (V3): ").strip(),
                'cert_path': input("  证书路径 (apiclient_key.pem): ").strip(),
                'cert_serial_no': input("  证书序列号: ").strip(),
                'notify_url': input(f"  回调URL (默认: https://{shop.domain}/api/payments/callback/wechat/): ").strip(),
                'is_active': True,
            }

            if not wechat_config['notify_url']:
                wechat_config['notify_url'] = f"https://{shop.domain}/api/payments/callback/wechat/"

            setup_wechat_pay(shop, wechat_config)

        # 配置支付宝
        alipay_choice = input("\n是否配置支付宝? (y/n): ").strip().lower()
        if alipay_choice == 'y':
            print("\n请输入支付宝配置信息:")
            alipay_config = {
                'app_id': input("  AppID: ").strip(),
                'app_private_key': input("  应用私钥 (完整内容): ").strip(),
                'alipay_public_key': input("  支付宝公钥 (完整内容): ").strip(),
                'notify_url': input(f"  回调URL (默认: https://{shop.domain}/api/payments/callback/alipay/): ").strip(),
                'return_url': input(f"  返回URL (默认: https://{shop.domain}/payment/result/): ").strip(),
                'is_active': True,
            }

            if not alipay_config['notify_url']:
                alipay_config['notify_url'] = f"https://{shop.domain}/api/payments/callback/alipay/"

            if not alipay_config['return_url']:
                alipay_config['return_url'] = f"https://{shop.domain}/payment/result/"

            setup_alipay(shop, alipay_config)

        # 配置现金支付（默认启用）
        setup_cash_payment(shop)

        print(f"\n✓ 店铺 '{shop.name}' 配置完成!")

    print(f"\n{'=' * 60}")
    print("所有配置完成!")
    print("=" * 60)


if __name__ == '__main__':
    main()

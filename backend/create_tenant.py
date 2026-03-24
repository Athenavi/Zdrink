import os

import django

# 设置 Django 环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zdrink_core.settings')
django.setup()

from apps.shops.models import Shop, Domain

# 创建第一个店铺
print("正在创建第一个店铺...")

shop = Shop.objects.create(
    schema_name='demo-shop',
    name='演示店铺',
    description='这是一个演示店铺',
    address='北京市朝阳区某某街道 123 号',
    phone='13800138000',
    email='demo@example.com',
    shop_type='cafe',
    is_active=True,
)

print(f"✓ 店铺创建成功：{shop.name} (ID: {shop.id})")
print(f"  Schema: {shop.schema_name}")

# 创建默认域名
domain = Domain.objects.create(
    tenant=shop,
    domain='demo.localhost',
    is_primary=True,
)

print(f"✓ 域名创建成功：{domain.domain}")
print("\n=== 完成 ===")
print(f"店铺已创建，可以使用以下信息访问：")
print(f"  - Schema: {shop.schema_name}")
print(f"  - Domain: {domain.domain}")

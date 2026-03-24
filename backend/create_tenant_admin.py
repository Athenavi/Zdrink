"""
创建租户管理员用户
用法：python manage.py shell < create_tenant_admin.py
"""
from django.contrib.auth import get_user_model

from apps.shops.models import Shop, ShopStaff

User = get_user_model()

# 1. 获取第一个店铺（租户）
shop = Shop.objects.first()
if not shop:
    print("错误：没有找到任何店铺！")
    exit(1)

print(f"找到店铺：{shop.name} (ID: {shop.id})")

# 2. 创建或更新管理员用户
username = 'shop_admin'
password = 'admin123'

try:
    admin_user = User.objects.get(username=username)
    print(f"用户 '{username}' 已存在，将更新密码")
except User.DoesNotExist:
    print(f"创建新用户：{username}")
    admin_user = User.objects.create_user(
        username=username,
        email='shop_admin@example.com',
        password=password,
        user_type='shop_owner'  # 设置为店铺所有者类型
    )

# 更新密码
admin_user.set_password(password)
admin_user.save()

# 3. 将该用户添加为店铺员工（店主角色）
staff, created = ShopStaff.objects.get_or_create(
    user=admin_user,
    shop=shop,
    defaults={
        'role': 'owner',  # 店主角色
        'is_active': True,
        'permissions': {
            'product_manage': True,
            'order_manage': True,
            'staff_manage': True,
            'settings_manage': True,
        }
    }
)

if not created:
    staff.role = 'owner'
    staff.is_active = True
    staff.permissions = {
        'product_manage': True,
        'order_manage': True,
        'staff_manage': True,
        'settings_manage': True,
    }
    staff.save()
    print(f"已更新用户 '{username}' 在店铺 '{shop.name}' 中的角色为：店主")
else:
    print(f"已创建用户 '{username}' 作为店铺 '{shop.name}' 的店主")

print("\n" + "=" * 50)
print("✅ 租户管理员创建成功！")
print("=" * 50)
print(f"\n登录信息：")
print(f"  用户名：{username}")
print(f"  密码：{password}")
print(f"  管理店铺：{shop.name}")
print(f"\n访问地址：http://localhost:8000/admin/")
print("\n该用户可以：")
print("  ✓ 查看和管理自己店铺的商品")
print("  ✓ 查看和管理自己店铺的订单")
print("  ✓ 管理店铺的员工")
print("  ✓ 修改店铺设置")
print("  ✗ 不能删除数据（只有超级管理员可以）")
print("=" * 50)

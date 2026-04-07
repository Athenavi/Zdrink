#!/usr/bin/env python
"""
统一权限修复工具
修复店铺管理员的 is_staff 权限和 Django Admin 访问权限

使用方法:
    python manage.py shell < scripts/fix_permissions.py
"""
import os

# 设置 Django 环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zdrink_core.settings')

import django

django.setup()

from django.contrib.auth import get_user_model
from apps.shops.models import ShopStaff

User = get_user_model()


def fix_admin_permissions():
    """修复所有店铺管理员的 Admin 访问权限"""

    print("=" * 70)
    print("开始修复店铺管理员的 Admin 访问权限")
    print("=" * 70)

    # 查找所有是店铺 owner 或 manager 的用户
    staff_members = ShopStaff.objects.filter(
        role__in=['owner', 'manager'],
        is_active=True
    ).select_related('user')

    print(f"\n找到 {staff_members.count()} 个店铺管理员\n")

    fixed_count = 0
    already_ok_count = 0

    for staff in staff_members:
        user = staff.user

        # 检查并修复 is_staff 权限
        if not user.is_staff:
            print(f"🔧 修复用户: {user.username} ({user.email})")
            print(f"   角色: {staff.get_role_display()}")
            print(f"   店铺: {staff.shop.name}")

            user.is_staff = True
            user.save(update_fields=['is_staff'])

            fixed_count += 1
            print(f"   ✅ 已设置 is_staff=True\n")
        else:
            print(f"✓ 用户: {user.username} - 权限正常")
            already_ok_count += 1

    print("\n" + "=" * 70)
    print(f"修复完成！")
    print(f"  - 已修复: {fixed_count} 个用户")
    print(f"  - 无需修复: {already_ok_count} 个用户")
    print("=" * 70)

    if fixed_count > 0:
        print("\n这些用户现在可以访问 Django Admin 后台了！")
        print("访问地址：http://localhost:8000/admin/")
    else:
        print("\n所有用户权限都正常，无需修复。")

    return fixed_count


if __name__ == '__main__':
    fix_admin_permissions()

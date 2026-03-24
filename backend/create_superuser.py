import os

import django

# 设置 Django 环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zdrink_core.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

# 创建超级管理员
print("正在创建超级管理员...")

try:
    admin = User.objects.create_superuser(
        username='admin',
        email='admin@example.com',
        password='admin123456',
        user_type='super_admin'
    )
    print(f"✓ 超级管理员创建成功！")
    print(f"  用户名：admin")
    print(f"  密码：admin123456")
except Exception as e:
    print(f"✗ 创建失败：{e}")

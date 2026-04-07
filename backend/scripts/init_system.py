#!/usr/bin/env python
"""
统一初始化管理脚本
提供店铺、用户、会员等级、积分规则的一站式初始化

使用方法:
    python manage.py shell < scripts/init_system.py
    
或者在 Django shell 中:
    from scripts.init_system import SystemInitializer
    initializer = SystemInitializer()
    initializer.run_all()
"""
import os
from decimal import Decimal

# 设置 Django 环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zdrink_core.settings')

import django

django.setup()

from django.contrib.auth import get_user_model
from apps.shops.models import Shop, Domain
from apps.users.models import MembershipLevelConfig, PointsRule

User = get_user_model()


class SystemInitializer:
    """系统初始化器"""

    def __init__(self):
        self.shop = None
        self.admin_user = None

    def create_shop(self, schema_name='demo-shop', name='演示店铺', domain='demo.localhost'):
        """创建店铺（租户）"""
        print("\n" + "=" * 70)
        print("步骤 1: 创建店铺")
        print("=" * 70)

        # 检查是否已存在
        if Shop.objects.filter(schema_name=schema_name).exists():
            print(f"⚠ 店铺 '{schema_name}' 已存在，跳过创建")
            self.shop = Shop.objects.get(schema_name=schema_name)
            return self.shop

        try:
            shop = Shop.objects.create(
                schema_name=schema_name,
                name=name,
                description='这是一个演示店铺',
                address='北京市朝阳区某某街道 123 号',
                phone='13800138000',
                email='demo@example.com',
                shop_type='cafe',
                is_active=True,
            )

            # 创建默认域名
            Domain.objects.create(
                tenant=shop,
                domain=domain,
                is_primary=True,
            )

            print(f"✓ 店铺创建成功: {shop.name} (ID: {shop.id})")
            print(f"  Schema: {shop.schema_name}")
            print(f"  Domain: {domain}")

            self.shop = shop
            return shop
        except Exception as e:
            print(f"✗ 店铺创建失败: {e}")
            return None

    def create_superuser(self, username='admin', password='admin123456', email='admin@example.com'):
        """创建超级管理员"""
        print("\n" + "=" * 70)
        print("步骤 2: 创建超级管理员")
        print("=" * 70)

        if User.objects.filter(username=username).exists():
            print(f"⚠ 用户 '{username}' 已存在，跳过创建")
            self.admin_user = User.objects.get(username=username)
            return self.admin_user

        try:
            admin = User.objects.create_superuser(
                username=username,
                email=email,
                password=password,
                user_type='super_admin'
            )
            print(f"✓ 超级管理员创建成功！")
            print(f"  用户名: {username}")
            print(f"  密码: {password}")

            self.admin_user = admin
            return admin
        except Exception as e:
            print(f"✗ 超级管理员创建失败: {e}")
            return None

    def create_tenant_admin(self, shop=None, username='shop_admin', password='admin123'):
        """创建租户管理员"""
        print("\n" + "=" * 70)
        print("步骤 3: 创建租户管理员")
        print("=" * 70)

        if not shop:
            shop = self.shop or Shop.objects.first()

        if not shop:
            print("✗ 没有找到店铺，请先创建店铺")
            return None

        print(f"目标店铺: {shop.name}")

        # 创建或更新管理员用户
        try:
            if User.objects.filter(username=username).exists():
                admin_user = User.objects.get(username=username)
                print(f"⚠ 用户 '{username}' 已存在，将更新密码和权限")
            else:
                admin_user = User.objects.create_user(
                    username=username,
                    email='shop_admin@example.com',
                    password=password,
                    user_type='shop_owner'
                )
                print(f"✓ 创建新用户: {username}")

            # 更新密码和 is_staff 权限
            admin_user.set_password(password)
            admin_user.is_staff = True
            admin_user.save()

            # 将该用户添加为店铺员工（店主角色）
            from apps.shops.models import ShopStaff
            staff, created = ShopStaff.objects.get_or_create(
                user=admin_user,
                shop=shop,
                defaults={
                    'role': 'owner',
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
                print(f"✓ 已更新用户在店铺中的角色为：店主")
            else:
                print(f"✓ 已创建用户作为店铺的店主")

            print(f"\n登录信息:")
            print(f"  用户名: {username}")
            print(f"  密码: {password}")
            print(f"  管理店铺: {shop.name}")
            print(f"  访问地址: http://localhost:8000/admin/")

            return admin_user
        except Exception as e:
            print(f"✗ 租户管理员创建失败: {e}")
            import traceback
            traceback.print_exc()
            return None

    def init_membership_levels(self, shop=None):
        """初始化五级会员等级配置"""
        print("\n" + "=" * 70)
        print("步骤 4: 初始化会员等级")
        print("=" * 70)

        if not shop:
            shop = self.shop or Shop.objects.first()

        if not shop:
            print("✗ 没有找到店铺，请先创建店铺")
            return False

        # 五级会员等级配置
        membership_levels = [
            {
                'level': 'regular',
                'name': '普通会员',
                'min_points': 0,
                'discount_rate': Decimal('1.00'),
                'points_earn_rate': Decimal('1.0'),
                'benefits': {
                    'description': '注册即享',
                    'items': ['消费累积积分', '订单进度追踪', '在线客服支持'],
                    'icon': '🎉',
                    'color': '#9CA3AF'
                }
            },
            {
                'level': 'silver',
                'name': '银卡会员',
                'min_points': 500,
                'discount_rate': Decimal('0.98'),
                'points_earn_rate': Decimal('1.2'),
                'benefits': {
                    'description': '累计500积分升级',
                    'items': ['全场98折优惠', '1.2倍积分加速', '生日专享礼包', '优先客服通道'],
                    'icon': '🥈',
                    'color': '#C0C0C0'
                }
            },
            {
                'level': 'gold',
                'name': '金卡会员',
                'min_points': 2000,
                'discount_rate': Decimal('0.95'),
                'points_earn_rate': Decimal('1.5'),
                'benefits': {
                    'description': '累计2000积分升级',
                    'items': ['全场95折优惠', '1.5倍积分加速', '每月免运费券×2', '专属优惠活动', '生日双倍积分'],
                    'icon': '🥇',
                    'color': '#FFD700'
                }
            },
            {
                'level': 'platinum',
                'name': '白金会员',
                'min_points': 5000,
                'discount_rate': Decimal('0.92'),
                'points_earn_rate': Decimal('1.8'),
                'benefits': {
                    'description': '累计5000积分升级',
                    'items': ['全场92折优惠', '1.8倍积分加速', '每月免运费券×4', '新品优先试饮', 'VIP专属活动邀请',
                              '专属生日礼遇'],
                    'icon': '💎',
                    'color': '#E5E4E2'
                }
            },
            {
                'level': 'diamond',
                'name': '钻石会员',
                'min_points': 10000,
                'discount_rate': Decimal('0.88'),
                'points_earn_rate': Decimal('2.0'),
                'benefits': {
                    'description': '累计10000积分升级',
                    'items': ['全场88折尊享', '2倍积分极速累积', '无限次免运费', '专属客户经理', '定制化服务',
                              '限量版产品优先购买权', '年度VIP晚宴邀请'],
                    'icon': '👑',
                    'color': '#B9F2FF'
                }
            }
        ]

        for level_data in membership_levels:
            level_config, created = MembershipLevelConfig.objects.get_or_create(
                shop=shop,
                level=level_data['level'],
                defaults={
                    'name': level_data['name'],
                    'min_points': level_data['min_points'],
                    'discount_rate': level_data['discount_rate'],
                    'points_earn_rate': level_data['points_earn_rate'],
                    'benefits': level_data['benefits'],
                    'is_active': True
                }
            )

            if created:
                print(f"  ✓ 创建 {level_data['name']} ({level_data['min_points']}积分)")
            else:
                level_config.name = level_data['name']
                level_config.min_points = level_data['min_points']
                level_config.discount_rate = level_data['discount_rate']
                level_config.points_earn_rate = level_data['points_earn_rate']
                level_config.benefits = level_data['benefits']
                level_config.is_active = True
                level_config.save()
                print(f"  ✓ 更新 {level_data['name']} ({level_data['min_points']}积分)")

        print("\n✅ 五级会员等级配置初始化完成！")
        return True

    def init_points_rules(self, shop=None):
        """初始化积分规则"""
        print("\n" + "=" * 70)
        print("步骤 5: 初始化积分规则")
        print("=" * 70)

        if not shop:
            shop = self.shop or Shop.objects.first()

        if not shop:
            print("✗ 没有找到店铺，请先创建店铺")
            return False

        # 1. 消费获得积分规则：每消费1元获得10积分
        order_earn_rule, created = PointsRule.objects.get_or_create(
            shop=shop,
            rule_type='order_earn',
            defaults={
                'name': '消费获得积分',
                'description': '每消费1元获得10积分',
                'config': {
                    'points_per_yuan': 10,
                    'min_order_amount': 0,
                },
                'is_active': True
            }
        )

        if created:
            print(f"  ✓ 创建消费积分规则")
        else:
            order_earn_rule.config = {
                'points_per_yuan': 10,
                'min_order_amount': 0,
            }
            order_earn_rule.save()
            print(f"  ✓ 更新消费积分规则")

        # 2. 签到获得积分规则：每日签到获得2积分
        signin_earn_rule, created = PointsRule.objects.get_or_create(
            shop=shop,
            rule_type='signin_earn',
            defaults={
                'name': '签到获得积分',
                'description': '每日签到获得2积分',
                'config': {
                    'points': 2,
                },
                'is_active': True
            }
        )

        if created:
            print(f"  ✓ 创建签到积分规则")
        else:
            signin_earn_rule.config = {
                'points': 2,
            }
            signin_earn_rule.save()
            print(f"  ✓ 更新签到积分规则")

        print("\n✅ 积分规则初始化完成！")
        return True

    def run_all(self):
        """运行所有初始化步骤"""
        print("\n" + "=" * 70)
        print("开始系统初始化")
        print("=" * 70)

        # 1. 创建店铺
        self.create_shop()

        # 2. 创建超级管理员
        self.create_superuser()

        # 3. 创建租户管理员
        self.create_tenant_admin()

        # 4. 初始化会员等级
        self.init_membership_levels()

        # 5. 初始化积分规则
        self.init_points_rules()

        print("\n" + "=" * 70)
        print("🎉 系统初始化全部完成！")
        print("=" * 70)
        print("\n可用账号:")
        print("  1. 超级管理员: admin / admin123456")
        print("  2. 店铺管理员: shop_admin / admin123")
        print("\n访问地址:")
        print("  - Django Admin: http://localhost:8000/admin/")
        print("  - API: http://localhost:8000/api/")
        print("=" * 70)


def main():
    """主函数"""
    initializer = SystemInitializer()
    initializer.run_all()


if __name__ == '__main__':
    main()

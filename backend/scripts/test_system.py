#!/usr/bin/env python
"""
统一测试工具 - 会员和积分系统测试
提供会员等级、积分系统的完整测试功能

使用方法:
    python manage.py shell < scripts/test_system.py
"""
import os
from decimal import Decimal

# 设置 Django 环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zdrink_core.settings')

import django

django.setup()

from django.contrib.auth import get_user_model
from apps.shops.models import Shop
from apps.users.models import MembershipLevelConfig, PointsRule, PointsLog
from apps.users.services import PointsService

User = get_user_model()


def show_membership_levels():
    """显示所有会员等级配置"""
    print("\n" + "=" * 70)
    print("五级会员等级体系")
    print("=" * 70)

    shop = Shop.objects.first()
    if not shop:
        print("❌ 没有找到店铺")
        return

    levels = MembershipLevelConfig.objects.filter(shop=shop, is_active=True).order_by('min_points')

    print(f"\n店铺: {shop.name}\n")
    print(f"{'等级':<12} {'所需积分':>8} {'折扣':>8} {'积分倍率':>10} {'权益数量':>8}")
    print("-" * 70)

    for level in levels:
        benefits_count = len(level.benefits.get('items', []))
        icon = level.benefits.get('icon', '')
        print(f"{icon} {level.name:<10} {level.min_points:>8} "
              f"{float(level.discount_rate):>7.2f} {float(level.points_earn_rate):>9.1f}x "
              f"{benefits_count:>6}项")

    print("\n" + "-" * 70)
    print("💡 提示: 消费1元获得10基础积分，再乘以会员等级倍率")
    print("=" * 70)


def test_membership_upgrade():
    """测试会员升级流程"""
    print("\n" + "=" * 70)
    print("测试会员升级流程")
    print("=" * 70)

    # 获取或创建测试用户
    user, created = User.objects.get_or_create(
        username='test_member',
        defaults={
            'user_type': 'customer',
            'email': 'test@example.com'
        }
    )

    shop = Shop.objects.first()
    if not shop:
        print("❌ 没有找到店铺")
        return False

    print(f"\n测试用户: {user.username}")
    print(f"当前积分: {user.total_points}")
    print(f"当前等级: {user.get_membership_level_display()}")

    # 模拟不同阶段的积分累积和升级
    test_scenarios = [
        (500, "升级到银卡"),
        (1500, "继续累积"),
        (2000, "升级到金卡"),
        (3000, "继续累积"),
        (5000, "升级到白金"),
        (8000, "继续累积"),
        (10000, "升级到钻石"),
    ]

    points_service = PointsService(user, shop)

    current_points = user.total_points
    for target_points, description in test_scenarios:
        points_to_add = target_points - current_points

        if points_to_add > 0:
            print(f"\n{'─' * 70}")
            print(f"📈 {description}: +{points_to_add} 积分")

            points_service.earn_points(
                points=points_to_add,
                points_type='adjust',
                notes=f'测试: {description}'
            )

            user.refresh_from_db()
            current_points = user.total_points

            print(f"   总积分: {current_points}")
            print(f"   等级: {user.get_membership_level_display()}")

            # 检查是否升级
            try:
                level_config = MembershipLevelConfig.objects.get(
                    shop=shop,
                    level=user.membership_level,
                    is_active=True
                )
                discount = float(level_config.discount_rate)
                multiplier = float(level_config.points_earn_rate)
                print(f"   ✨ 享受 {discount:.2f} 折扣，{multiplier}x 积分倍率")
            except Exception as e:
                print(f"   ⚠ 获取等级信息失败: {e}")

    print(f"\n{'=' * 70}")
    print("✅ 会员升级测试完成！")
    print("=" * 70)
    return True


def test_signin_points():
    """测试签到积分"""
    print("\n" + "=" * 70)
    print("测试1: 签到获得积分")
    print("=" * 70)

    # 获取第一个用户和店铺
    user = User.objects.filter(user_type='customer').first()
    shop = Shop.objects.first()

    if not user or not shop:
        print("❌ 没有找到用户或店铺")
        return False

    print(f"用户: {user.username}")
    print(f"店铺: {shop.name}")
    print(f"当前可用积分: {user.available_points}")

    # 获取签到规则
    rule = PointsRule.objects.get(shop=shop, rule_type='signin_earn', is_active=True)
    signin_points = rule.config.get('points', 2)
    print(f"签到应得积分: {signin_points}")

    # 执行签到
    points_service = PointsService(user, shop)
    points_service.earn_points(
        points=signin_points,
        points_type='earn_signin',
        notes='每日签到'
    )

    # 刷新用户数据
    user.refresh_from_db()
    print(f"签到后可用积分: {user.available_points}")

    # 检查积分记录
    log = PointsLog.objects.filter(
        user=user,
        shop=shop,
        points_type='earn_signin'
    ).order_by('-created_at').first()

    if log and log.points == signin_points:
        print(f"✓ 签到积分记录正确: +{log.points} 积分")
        return True
    else:
        print("❌ 签到积分记录错误")
        return False


def test_order_points():
    """测试订单消费积分（每消费1元获得10积分）"""
    print("\n" + "=" * 70)
    print("测试2: 订单消费获得积分")
    print("=" * 70)

    # 获取第一个用户和店铺
    user = User.objects.filter(user_type='customer').first()
    shop = Shop.objects.first()

    if not user or not shop:
        print("❌ 没有找到用户或店铺")
        return False

    print(f"用户: {user.username}")
    print(f"店铺: {shop.name}")
    print(f"当前可用积分: {user.available_points}")

    # 模拟订单金额
    order_amount = Decimal('58.50')  # 58.5元
    print(f"订单金额: ¥{order_amount}")

    # 获取消费积分规则
    rule = PointsRule.objects.get(shop=shop, rule_type='order_earn', is_active=True)
    points_per_yuan = rule.config.get('points_per_yuan', 10)
    expected_points = int(float(order_amount) * points_per_yuan)
    print(f"积分规则: 每消费1元获得{points_per_yuan}积分")
    print(f"预期获得积分: {expected_points}")

    # 执行积分奖励
    points_service = PointsService(user, shop)
    points_service.earn_points(
        points=expected_points,
        points_type='earn_order',
        reference_id='test_order_999',
        notes=f'测试订单消费获得积分'
    )

    # 刷新用户数据
    user.refresh_from_db()
    print(f"获得积分后可用积分: {user.available_points}")

    # 检查积分记录
    log = PointsLog.objects.filter(
        user=user,
        shop=shop,
        points_type='earn_order',
        reference_id='test_order_999'
    ).first()

    if log and log.points == expected_points:
        print(f"✓ 订单积分记录正确: +{log.points} 积分")
        return True
    else:
        print("❌ 订单积分记录错误")
        return False


def show_points_summary():
    """显示积分汇总信息"""
    print("\n" + "=" * 70)
    print("积分系统配置汇总")
    print("=" * 70)

    shops = Shop.objects.all()
    for shop in shops:
        print(f"\n店铺: {shop.name}")

        # 消费积分规则
        try:
            order_rule = PointsRule.objects.get(shop=shop, rule_type='order_earn', is_active=True)
            print(f"  ✓ 消费积分: 每消费1元获得{order_rule.config.get('points_per_yuan')}积分")
        except PointsRule.DoesNotExist:
            print(f"  ❌ 消费积分规则未配置")

        # 签到积分规则
        try:
            signin_rule = PointsRule.objects.get(shop=shop, rule_type='signin_earn', is_active=True)
            print(f"  ✓ 签到积分: 每日签到获得{signin_rule.config.get('points')}积分")
        except PointsRule.DoesNotExist:
            print(f"  ❌ 签到积分规则未配置")

    # 显示用户积分情况
    print("\n" + "-" * 70)
    print("用户积分情况:")
    users = User.objects.filter(user_type='customer')[:5]
    for user in users:
        print(f"  {user.username}: 可用积分={user.available_points}, 累计积分={user.total_points}")


def debug_user_membership(username=None):
    """调试指定用户的会员等级信息"""
    print("\n" + "=" * 70)
    print("会员等级调试工具")
    print("=" * 70)

    if not username:
        # 默认使用最后一个客户用户
        user = User.objects.filter(user_type='customer').last()
        if not user:
            print("❌ 没有找到客户用户")
            return
    else:
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            print(f"❌ 用户 '{username}' 不存在")
            return

    shop = Shop.objects.first()
    if not shop:
        print("❌ 没有找到店铺")
        return

    print(f'\n用户: {user.username}')
    print(f'总积分: {user.total_points}')
    print(f'当前等级: {user.membership_level}')

    levels = shop.membership_levels.filter(is_active=True).order_by('min_points')
    print('\n所有等级:')
    for l in levels:
        print(f'  {l.name}: {l.min_points}积分')

    # 查找下一等级
    next_level = None
    total = user.total_points
    for level in levels:
        if level.min_points > total:
            next_level = level
            break

    if next_level:
        print(f'\n下一等级: {next_level.name}')
        print(f'需要积分: {next_level.min_points - total}')
    else:
        print('\n已达最高等级')


def run_all_tests():
    """运行所有测试"""
    print("\n" + "=" * 70)
    print("系统功能测试套件")
    print("=" * 70)

    # 1. 显示会员等级
    show_membership_levels()

    # 2. 显示积分配置
    show_points_summary()

    # 3. 测试会员升级
    membership_test_passed = test_membership_upgrade()

    # 4. 测试签到积分
    signin_test_passed = test_signin_points()

    # 5. 测试订单积分
    order_test_passed = test_order_points()

    # 测试结果汇总
    print("\n" + "=" * 70)
    print("测试结果汇总")
    print("=" * 70)
    print(f"会员升级测试: {'✓ 通过' if membership_test_passed else '❌ 失败'}")
    print(f"签到积分测试: {'✓ 通过' if signin_test_passed else '❌ 失败'}")
    print(f"订单积分测试: {'✓ 通过' if order_test_passed else '❌ 失败'}")

    all_passed = membership_test_passed and signin_test_passed and order_test_passed

    if all_passed:
        print("\n🎉 所有测试通过！系统工作正常。")
    else:
        print("\n⚠ 部分测试未通过，请检查配置。")

    return all_passed


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description='系统测试工具')
    parser.add_argument('--mode', choices=['all', 'membership', 'points', 'debug'],
                        default='all', help='测试模式')
    parser.add_argument('--username', type=str, help='调试指定用户')

    args = parser.parse_args()

    if args.mode == 'all':
        run_all_tests()
    elif args.mode == 'membership':
        show_membership_levels()
        test_membership_upgrade()
    elif args.mode == 'points':
        show_points_summary()
        test_signin_points()
        test_order_points()
    elif args.mode == 'debug':
        debug_user_membership(args.username)

"""
测试五级会员升级系统
运行方式: python manage.py shell < scripts/test_membership_system.py
"""
from django.contrib.auth import get_user_model

from apps.shops.models import Shop
from apps.users.models import MembershipLevelConfig
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


def calculate_upgrade_examples():
    """计算升级示例"""
    print("\n" + "=" * 70)
    print("升级所需消费金额示例")
    print("=" * 70)

    shop = Shop.objects.first()
    if not shop:
        return

    levels = MembershipLevelConfig.objects.filter(shop=shop, is_active=True).order_by('min_points')

    print(f"\n{'等级':<12} {'所需积分':>10} {'预计消费':>12} {'说明':<30}")
    print("-" * 70)

    explanations = [
        "注册即享",
        "约消费50元（500积分）",
        "约消费200元（2000积分）",
        "约消费500元（5000积分）",
        "约消费1000元（10000积分）"
    ]

    for i, level in enumerate(levels):
        explanation = explanations[i] if i < len(explanations) else ""
        estimated_consumption = level.min_points / 10  # 每元10积分
        print(f"{level.name:<12} {level.min_points:>10} "
              f"¥{estimated_consumption:>10.0f} {explanation:<30}")

    print("\n💡 注: 实际消费金额会因会员等级积分倍率而有所不同")
    print("=" * 70)


if __name__ == '__main__':
    print("\n" + "=" * 70)
    print("五级会员升级系统测试")
    print("=" * 70)

    # 1. 显示会员等级
    show_membership_levels()

    # 2. 计算升级示例
    calculate_upgrade_examples()

    # 3. 测试升级流程
    test_passed = test_membership_upgrade()

    if test_passed:
        print("\n🎉 所有测试通过！五级会员系统运行正常。")
    else:
        print("\n⚠ 测试未通过，请检查配置。")

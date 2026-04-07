"""
测试积分功能脚本
运行方式: python manage.py shell < scripts/test_points_system.py
"""
from decimal import Decimal

from django.contrib.auth import get_user_model

from apps.shops.models import Shop
from apps.users.models import PointsRule, PointsLog
from apps.users.services import PointsService

User = get_user_model()


def test_signin_points():
    """测试签到积分"""
    print("\n" + "=" * 60)
    print("测试1: 签到获得积分")
    print("=" * 60)

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
    print("\n" + "=" * 60)
    print("测试2: 订单消费获得积分")
    print("=" * 60)

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
    print("\n" + "=" * 60)
    print("积分系统配置汇总")
    print("=" * 60)

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
    print("\n" + "-" * 60)
    print("用户积分情况:")
    users = User.objects.filter(user_type='customer')[:5]
    for user in users:
        print(f"  {user.username}: 可用积分={user.available_points}, 累计积分={user.total_points}")


if __name__ == '__main__':
    print("\n" + "=" * 60)
    print("积分功能测试")
    print("=" * 60)

    # 显示配置汇总
    show_points_summary()

    # 运行测试
    test1_passed = test_signin_points()
    test2_passed = test_order_points()

    # 测试结果汇总
    print("\n" + "=" * 60)
    print("测试结果汇总")
    print("=" * 60)
    print(f"签到积分测试: {'✓ 通过' if test1_passed else '❌ 失败'}")
    print(f"订单积分测试: {'✓ 通过' if test2_passed else '❌ 失败'}")

    if test1_passed and test2_passed:
        print("\n🎉 所有测试通过！积分系统工作正常。")
    else:
        print("\n⚠ 部分测试未通过，请检查配置。")

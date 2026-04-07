"""
初始化积分规则脚本
运行方式: python manage.py shell < scripts/init_points_rules.py
"""
from apps.shops.models import Shop
from apps.users.models import PointsRule


def init_points_rules():
    """为所有店铺初始化积分规则"""

    shops = Shop.objects.all()

    if not shops.exists():
        print("没有找到任何店铺，请先创建店铺")
        return

    for shop in shops:
        print(f"\n处理店铺: {shop.name}")

        # 1. 消费获得积分规则：每消费1元获得10积分
        order_earn_rule, created = PointsRule.objects.get_or_create(
            shop=shop,
            rule_type='order_earn',
            defaults={
                'name': '消费获得积分',
                'description': '每消费1元获得10积分',
                'config': {
                    'points_per_yuan': 10,  # 每元获得的积分数
                    'min_order_amount': 0,  # 最小订单金额
                },
                'is_active': True
            }
        )

        if created:
            print(f"  ✓ 创建消费积分规则")
        else:
            # 更新配置
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
                    'points': 2,  # 每次签到获得的积分
                },
                'is_active': True
            }
        )

        if created:
            print(f"  ✓ 创建签到积分规则")
        else:
            # 更新配置
            signin_earn_rule.config = {
                'points': 2,
            }
            signin_earn_rule.save()
            print(f"  ✓ 更新签到积分规则")

    print("\n✅ 积分规则初始化完成！")


if __name__ == '__main__':
    init_points_rules()

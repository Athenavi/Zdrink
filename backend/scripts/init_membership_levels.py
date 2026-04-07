"""
初始化五级会员等级配置脚本
运行方式: python manage.py shell < scripts/init_membership_levels.py
"""
from decimal import Decimal

from apps.shops.models import Shop
from apps.users.models import MembershipLevelConfig


def init_membership_levels():
    """为所有店铺初始化五级会员等级配置"""

    shops = Shop.objects.all()

    if not shops.exists():
        print("❌ 没有找到任何店铺，请先创建店铺")
        return

    # 五级会员等级配置
    membership_levels = [
        {
            'level': 'regular',
            'name': '普通会员',
            'min_points': 0,
            'discount_rate': Decimal('1.00'),  # 无折扣
            'points_earn_rate': Decimal('1.0'),  # 1倍积分
            'benefits': {
                'description': '注册即享',
                'items': [
                    '消费累积积分',
                    '订单进度追踪',
                    '在线客服支持'
                ],
                'icon': '🎉',
                'color': '#9CA3AF'  # 灰色
            }
        },
        {
            'level': 'silver',
            'name': '银卡会员',
            'min_points': 500,
            'discount_rate': Decimal('0.98'),  # 98折
            'points_earn_rate': Decimal('1.2'),  # 1.2倍积分
            'benefits': {
                'description': '累计500积分升级',
                'items': [
                    '全场98折优惠',
                    '1.2倍积分加速',
                    '生日专享礼包',
                    '优先客服通道'
                ],
                'icon': '🥈',
                'color': '#C0C0C0'  # 银色
            }
        },
        {
            'level': 'gold',
            'name': '金卡会员',
            'min_points': 2000,
            'discount_rate': Decimal('0.95'),  # 95折
            'points_earn_rate': Decimal('1.5'),  # 1.5倍积分
            'benefits': {
                'description': '累计2000积分升级',
                'items': [
                    '全场95折优惠',
                    '1.5倍积分加速',
                    '每月免运费券×2',
                    '专属优惠活动',
                    '生日双倍积分'
                ],
                'icon': '🥇',
                'color': '#FFD700'  # 金色
            }
        },
        {
            'level': 'platinum',
            'name': '白金会员',
            'min_points': 5000,
            'discount_rate': Decimal('0.92'),  # 92折
            'points_earn_rate': Decimal('1.8'),  # 1.8倍积分
            'benefits': {
                'description': '累计5000积分升级',
                'items': [
                    '全场92折优惠',
                    '1.8倍积分加速',
                    '每月免运费券×4',
                    '新品优先试饮',
                    'VIP专属活动邀请',
                    '专属生日礼遇'
                ],
                'icon': '💎',
                'color': '#E5E4E2'  # 白金色
            }
        },
        {
            'level': 'diamond',
            'name': '钻石会员',
            'min_points': 10000,
            'discount_rate': Decimal('0.88'),  # 88折
            'points_earn_rate': Decimal('2.0'),  # 2倍积分
            'benefits': {
                'description': '累计10000积分升级',
                'items': [
                    '全场88折尊享',
                    '2倍积分极速累积',
                    '无限次免运费',
                    '专属客户经理',
                    '定制化服务',
                    '限量版产品优先购买权',
                    '年度VIP晚宴邀请'
                ],
                'icon': '👑',
                'color': '#B9F2FF'  # 钻石蓝
            }
        }
    ]

    for shop in shops:
        print(f"\n{'=' * 60}")
        print(f"处理店铺: {shop.name}")
        print('=' * 60)

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
                # 更新配置
                level_config.name = level_data['name']
                level_config.min_points = level_data['min_points']
                level_config.discount_rate = level_data['discount_rate']
                level_config.points_earn_rate = level_data['points_earn_rate']
                level_config.benefits = level_data['benefits']
                level_config.is_active = True
                level_config.save()
                print(f"  ✓ 更新 {level_data['name']} ({level_data['min_points']}积分)")

    print(f"\n{'=' * 60}")
    print("✅ 五级会员等级配置初始化完成！")
    print('=' * 60)

    # 显示配置汇总
    print("\n会员等级配置汇总:")
    print("-" * 60)
    for level_data in membership_levels:
        icon = level_data.get('icon', '')
        name = level_data['name']
        min_points = level_data['min_points']
        discount_rate = float(level_data['discount_rate'])
        earn_rate = level_data['points_earn_rate']
        print(f"{icon} {name:12} | 积分: {min_points:5} | 折扣: {discount_rate:.2f} | 积分倍率: {earn_rate}x")


if __name__ == '__main__':
    init_membership_levels()

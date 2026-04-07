"""手动修复会员等级"""
from django.contrib.auth import get_user_model

from apps.shops.models import Shop
from apps.users.services import PointsService

# 获取所有客户用户
users = get_user_model().objects.filter(user_type='customer')
shop = Shop.objects.first()

print(f"店铺: {shop.name}\n")

for user in users:
    print(f"用户: {user.username}")
    print(f"  当前积分: {user.total_points}")
    print(f"  当前等级: {user.membership_level}")

    # 执行升级检查
    points_service = PointsService(user, shop)
    old_level = user.membership_level
    points_service.check_membership_upgrade()

    # 刷新用户数据
    user.refresh_from_db()
    new_level = user.membership_level

    if old_level != new_level:
        print(f"  ✨ 等级已升级: {old_level} -> {new_level}")
    else:
        print(f"  - 等级未变化")
    print()

print("✅ 所有用户等级检查完成！")

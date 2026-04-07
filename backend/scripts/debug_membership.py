"""调试会员等级信息"""
from django.contrib.auth import get_user_model

from apps.shops.models import Shop

user = get_user_model().objects.get(username='test')
shop = Shop.objects.first()

print(f'用户: {user.username}')
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

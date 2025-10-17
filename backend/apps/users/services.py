from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from .models import PointsLog, PointsRule, MembershipLevelConfig


class PointsService:
    """积分服务"""

    def __init__(self, user, shop):
        self.user = user
        self.shop = shop

    def earn_points(self, points, points_type, reference_id='', notes=''):
        """获得积分"""
        with transaction.atomic():
            # 更新用户积分
            self.user.available_points += points
            self.user.total_points += points
            self.user.save()

            # 记录积分日志
            PointsLog.objects.create(
                user=self.user,
                points_type=points_type,
                points=points,
                current_points=self.user.available_points,
                notes=notes,
                reference_id=reference_id,
                shop=self.shop
            )

            # 检查是否需要升级会员等级
            self.check_membership_upgrade()

    def consume_points(self, points, points_type, reference_id='', notes=''):
        """消耗积分"""
        if self.user.available_points < points:
            raise ValueError("积分不足")

        with transaction.atomic():
            # 更新用户积分
            self.user.available_points -= points
            self.user.used_points += points
            self.user.save()

            # 记录积分日志
            PointsLog.objects.create(
                user=self.user,
                points_type=points_type,
                points=-points,
                current_points=self.user.available_points,
                notes=notes,
                reference_id=reference_id,
                shop=self.shop
            )

    def check_membership_upgrade(self):
        """检查会员等级升级"""
        current_level = self.user.membership_level
        total_points = self.user.total_points

        # 获取所有会员等级配置
        levels = MembershipLevelConfig.objects.filter(
            shop=self.shop,
            is_active=True
        ).order_by('min_points')

        new_level = current_level

        for level in levels:
            if total_points >= level.min_points:
                new_level = level.level
            else:
                break

        if new_level != current_level:
            self.user.membership_level = new_level
            self.user.save()

    def process_order_points(self, order):
        """处理订单积分"""
        # 获取消费获得积分规则
        try:
            rule = PointsRule.objects.get(
                shop=self.shop,
                rule_type='order_earn',
                is_active=True
            )

            # 计算获得积分
            points_rate = rule.config.get('points_rate', 0.1)  # 默认1元获得0.1积分
            points = int(order.total_amount * Decimal(points_rate))

            if points > 0:
                self.earn_points(
                    points=points,
                    points_type='earn_order',
                    reference_id=order.order_number,
                    notes=f"订单消费获得积分"
                )

        except PointsRule.DoesNotExist:
            pass


class MembershipService:
    """会员服务"""

    def __init__(self, user, shop):
        self.user = user
        self.shop = shop

    def get_membership_discount(self, order_amount):
        """获取会员折扣"""
        try:
            level_config = MembershipLevelConfig.objects.get(
                shop=self.shop,
                level=self.user.membership_level,
                is_active=True
            )
            discount_amount = order_amount * (1 - level_config.discount_rate)
            return discount_amount
        except MembershipLevelConfig.DoesNotExist:
            return Decimal('0.00')

    def recharge(self, amount, payment_method):
        """会员充值"""
        from .models import MemberRecharge

        # 获取充值赠送规则
        gift_amount = Decimal('0.00')
        gift_points = 0

        # 这里可以根据充值金额设置不同的赠送规则
        if amount >= 100:
            gift_amount = amount * Decimal('0.1')  # 充100送10
            gift_points = int(amount * 1.5)  # 1.5倍积分

        with transaction.atomic():
            # 创建充值记录
            recharge = MemberRecharge.objects.create(
                user=self.user,
                recharge_amount=amount,
                gift_amount=gift_amount,
                gift_points=gift_points,
                payment_method=payment_method,
                shop=self.shop
            )

            # 如果是余额支付，立即到账
            if payment_method == 'balance':
                recharge.payment_status = True
                recharge.paid_at = timezone.now()
                recharge.save()

                # 赠送积分
                if gift_points > 0:
                    points_service = PointsService(self.user, self.shop)
                    points_service.earn_points(
                        points=gift_points,
                        points_type='earn_order',
                        reference_id=recharge.id,
                        notes=f"充值赠送积分"
                    )

            return recharge
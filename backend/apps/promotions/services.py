from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from .models import Coupon, UserCoupon, CouponRule, Promotion


class CouponService:
    """优惠券服务"""

    def __init__(self, user, shop):
        self.user = user
        self.shop = shop

    def claim_coupon(self, coupon_code):
        """领取优惠券"""
        try:
            coupon = Coupon.objects.get(
                code=coupon_code,
                shop=self.shop,
                is_active=True
            )

            # 检查优惠券是否可用
            if not coupon.is_available:
                raise ValueError("优惠券不可用")

            # 检查用户是否已经领取过
            user_coupon_count = UserCoupon.objects.filter(
                user=self.user,
                coupon=coupon
            ).count()

            if user_coupon_count >= coupon.limit_per_user:
                raise ValueError("已超过领取限制")

            with transaction.atomic():
                # 创建用户优惠券
                user_coupon = UserCoupon.objects.create(
                    user=self.user,
                    coupon=coupon
                )

                # 更新优惠券已领取数量
                coupon.used_quantity += 1
                coupon.save()

                return user_coupon

        except Coupon.DoesNotExist:
            raise ValueError("优惠券不存在")

    def calculate_discount(self, coupon, order_amount, order_items):
        """计算优惠券折扣金额"""
        if not coupon.is_available:
            return Decimal('0.00')

        # 检查最低订单金额
        if order_amount < coupon.min_order_amount:
            return Decimal('0.00')

        # 检查适用范围
        if not self._check_apply_scope(coupon, order_items):
            return Decimal('0.00')

        # 计算折扣金额
        if coupon.coupon_type == 'fixed':
            discount_amount = coupon.value
        elif coupon.coupon_type == 'percentage':
            discount_amount = order_amount * coupon.value / 100
            if coupon.max_discount and discount_amount > coupon.max_discount:
                discount_amount = coupon.max_discount
        elif coupon.coupon_type == 'shipping':
            # 免运费逻辑，这里需要根据业务实现
            discount_amount = Decimal('0.00')  # 实际应该返回运费金额
        else:
            discount_amount = Decimal('0.00')

        return min(discount_amount, order_amount)

    def _check_apply_scope(self, coupon, order_items):
        """检查优惠券适用范围"""
        if coupon.apply_to == 'all':
            return True

        apply_to_ids = coupon.apply_to_ids

        for item in order_items:
            if coupon.apply_to == 'category':
                if item.product.category_id in apply_to_ids:
                    return True
            elif coupon.apply_to == 'product':
                if item.product_id in apply_to_ids:
                    return True

        return False

    def apply_auto_coupons(self):
        """自动发放优惠券（根据规则）"""
        rules = CouponRule.objects.filter(
            shop=self.shop,
            is_active=True
        )

        for rule in rules:
            if self._check_rule_condition(rule):
                self.claim_coupon(rule.coupon.code)

    def _check_rule_condition(self, rule):
        """检查规则条件"""
        if rule.rule_type == 'auto_register':
            # 注册自动发放
            from apps.users.models import User
            return User.objects.filter(id=self.user.id).count() == 1

        elif rule.rule_type == 'first_order':
            # 首单完成后发放
            from apps.orders.models import Order
            completed_orders = Order.objects.filter(
                user=self.user,
                shop=self.shop,
                status='completed'
            ).count()
            return completed_orders == 1

        elif rule.rule_type == 'birthday':
            # 生日发放
            today = timezone.now().date()
            return self.user.birthday and self.user.birthday.month == today.month and self.user.birthday.day == today.day

        return False


class PromotionService:
    """促销服务"""

    def __init__(self, shop):
        self.shop = shop

    def get_applicable_promotions(self, order_items):
        """获取适用的促销活动"""
        promotions = Promotion.objects.filter(
            shop=self.shop,
            is_active=True,
            valid_from__lte=timezone.now(),
            valid_until__gte=timezone.now()
        )

        applicable_promotions = []

        for promotion in promotions:
            if self._check_promotion_condition(promotion, order_items):
                applicable_promotions.append(promotion)

        return applicable_promotions

    def _check_promotion_condition(self, promotion, order_items):
        """检查促销条件"""
        # 检查金额条件
        if promotion.condition_amount:
            order_amount = sum(item.total_price for item in order_items)
            if order_amount < promotion.condition_amount:
                return False

        # 检查数量条件
        if promotion.condition_quantity:
            total_quantity = sum(item.quantity for item in order_items)
            if total_quantity < promotion.condition_quantity:
                return False

        # 检查商品范围
        if promotion.apply_to_products.exists() or promotion.apply_to_categories.exists():
            has_applicable_item = False

            for item in order_items:
                if promotion.apply_to_products.filter(id=item.product_id).exists():
                    has_applicable_item = True
                    break

                if (item.product.category_id and
                        promotion.apply_to_categories.filter(id=item.product.category_id).exists()):
                    has_applicable_item = True
                    break

            if not has_applicable_item:
                return False

        return True

    def calculate_promotion_discount(self, promotion, order_items):
        """计算促销折扣"""
        if promotion.promotion_type == 'discount':
            if promotion.discount_rate:
                applicable_amount = self._get_applicable_amount(promotion, order_items)
                return applicable_amount * promotion.discount_rate
            elif promotion.discount_amount:
                return promotion.discount_amount

        return Decimal('0.00')

    def _get_applicable_amount(self, promotion, order_items):
        """获取适用促销的商品金额"""
        if not promotion.apply_to_products.exists() and not promotion.apply_to_categories.exists():
            return sum(item.total_price for item in order_items)

        applicable_amount = Decimal('0.00')

        for item in order_items:
            if (promotion.apply_to_products.filter(id=item.product_id).exists() or
                    (item.product.category_id and
                     promotion.apply_to_categories.filter(id=item.product.category_id).exists())):
                applicable_amount += item.total_price

        return applicable_amount
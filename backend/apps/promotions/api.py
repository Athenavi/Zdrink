from apps.core.permissions import IsShopOwnerOrStaff
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from .models import Coupon, UserCoupon, CouponRule, Promotion
from .serializers import (
    CouponSerializer, UserCouponSerializer, CouponRuleSerializer,
    PromotionSerializer, ClaimCouponSerializer, ApplyCouponSerializer
)
from .services import CouponService, PromotionService


class CouponViewSet(ModelViewSet):
    """优惠券管理"""
    serializer_class = CouponSerializer
    permission_classes = [IsShopOwnerOrStaff]

    def get_queryset(self):
        return Coupon.objects.filter(shop=self.request.tenant)

    def perform_create(self, serializer):
        serializer.save(shop=self.request.tenant)


class UserCouponViewSet(ModelViewSet):
    """用户优惠券"""
    serializer_class = UserCouponSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserCoupon.objects.filter(
            user=self.request.user,
            coupon__shop=self.request.tenant
        ).select_related('coupon')

    @action(detail=False, methods=['get'])
    def available(self, request):
        """可用的用户优惠券"""
        from django.utils import timezone

        user_coupons = self.get_queryset().filter(
            status='available',
            coupon__valid_until__gte=timezone.now()
        )
        serializer = self.get_serializer(user_coupons, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def claim(self, request):
        """领取优惠券"""
        serializer = ClaimCouponSerializer(data=request.data)

        if serializer.is_valid():
            coupon_code = serializer.validated_data['coupon_code']

            coupon_service = CouponService(request.user, request.tenant)

            try:
                user_coupon = coupon_service.claim_coupon(coupon_code)
                return Response(UserCouponSerializer(user_coupon).data)

            except ValueError as e:
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_400_BAD_REQUEST
                )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CouponRuleViewSet(ModelViewSet):
    """优惠券发放规则管理"""
    serializer_class = CouponRuleSerializer
    permission_classes = [IsShopOwnerOrStaff]

    def get_queryset(self):
        return CouponRule.objects.filter(shop=self.request.tenant).select_related('coupon')

    def perform_create(self, serializer):
        serializer.save(shop=self.request.tenant)


class PromotionViewSet(ModelViewSet):
    """促销活动管理"""
    serializer_class = PromotionSerializer
    permission_classes = [IsShopOwnerOrStaff]

    def get_queryset(self):
        return Promotion.objects.filter(shop=self.request.tenant)

    def perform_create(self, serializer):
        serializer.save(shop=self.request.tenant)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def apply_coupon(request):
    """应用优惠券"""
    serializer = ApplyCouponSerializer(data=request.data)

    if serializer.is_valid():
        coupon_code = serializer.validated_data['coupon_code']
        order_id = serializer.validated_data.get('order_id')
        cart_id = serializer.validated_data.get('cart_id')

        # 获取优惠券
        try:
            coupon = Coupon.objects.get(
                code=coupon_code,
                shop=request.tenant,
                is_active=True
            )
        except Coupon.DoesNotExist:
            return Response(
                {'error': '优惠券不存在'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 检查用户是否拥有该优惠券
        user_coupon = UserCoupon.objects.filter(
            user=request.user,
            coupon=coupon,
            status='available'
        ).first()

        if not user_coupon:
            return Response(
                {'error': '您没有此优惠券或优惠券已使用'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 计算订单金额和商品
        order_amount = Decimal('0.00')
        order_items = []

        if order_id:
            from apps.orders.models import Order, OrderItem
            try:
                order = Order.objects.get(id=order_id, user=request.user)
                order_amount = order.subtotal
                order_items = list(order.items.all())
            except Order.DoesNotExist:
                return Response(
                    {'error': '订单不存在'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        elif cart_id:
            from apps.orders.models import Cart, CartItem
            try:
                cart = Cart.objects.get(id=cart_id, user=request.user)
                order_amount = cart.total_price
                order_items = list(cart.items.all())
            except Cart.DoesNotExist:
                return Response(
                    {'error': '购物车不存在'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # 计算折扣金额
        coupon_service = CouponService(request.user, request.tenant)
        discount_amount = coupon_service.calculate_discount(coupon, order_amount, order_items)

        return Response({
            'coupon_id': coupon.id,
            'coupon_code': coupon.code,
            'discount_amount': discount_amount,
            'user_coupon_id': user_coupon.id
        })

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def available_coupons(request):
    """获取可领取的优惠券"""
    from django.utils import timezone

    coupons = Coupon.objects.filter(
        shop=request.tenant,
        is_active=True,
        valid_from__lte=timezone.now(),
        valid_until__gte=timezone.now()
    ).exclude(
        usercoupon__user=request.user if request.user.is_authenticated else None
    )

    serializer = CouponSerializer(coupons, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def current_promotions(request):
    """获取当前促销活动"""
    promotion_service = PromotionService(request.tenant)
    promotions = promotion_service.get_applicable_promotions([])  # 空商品列表，获取所有可用促销

    serializer = PromotionSerializer(promotions, many=True)
    return Response(serializer.data)
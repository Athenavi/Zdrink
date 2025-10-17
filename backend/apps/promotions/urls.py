from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .api import (
    CouponViewSet, UserCouponViewSet, CouponRuleViewSet, PromotionViewSet,
    apply_coupon, available_coupons, current_promotions
)

router = DefaultRouter()
router.register(r'coupons', CouponViewSet, basename='coupon')
router.register(r'user-coupons', UserCouponViewSet, basename='user-coupon')
router.register(r'coupon-rules', CouponRuleViewSet, basename='coupon-rule')
router.register(r'promotions', PromotionViewSet, basename='promotion')

urlpatterns = [
    path('', include(router.urls)),
    path('apply-coupon/', apply_coupon, name='apply-coupon'),
    path('available-coupons/', available_coupons, name='available-coupons'),
    path('current-promotions/', current_promotions, name='current-promotions'),
]
from django.contrib import admin

from .models import Coupon, UserCoupon, CouponRule, Promotion


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'coupon_type', 'value', 'total_quantity', 'used_quantity', 'is_active']
    list_filter = ['coupon_type', 'is_active', 'shop']
    search_fields = ['name', 'code']

@admin.register(UserCoupon)
class UserCouponAdmin(admin.ModelAdmin):
    list_display = ['user', 'coupon', 'status', 'used_at', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['user__username', 'coupon__name']

@admin.register(CouponRule)
class CouponRuleAdmin(admin.ModelAdmin):
    list_display = ['name', 'rule_type', 'coupon', 'is_active']
    list_filter = ['rule_type', 'is_active', 'shop']
    search_fields = ['name']

@admin.register(Promotion)
class PromotionAdmin(admin.ModelAdmin):
    list_display = ['name', 'promotion_type', 'is_active', 'valid_from', 'valid_until']
    list_filter = ['promotion_type', 'is_active']
    search_fields = ['name']
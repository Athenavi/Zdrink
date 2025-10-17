from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ['username', 'email', 'phone', 'user_type', 'is_active', 'date_joined']
    list_filter = ['user_type', 'is_active', 'is_staff', 'date_joined']
    search_fields = ['username', 'email', 'phone']
    ordering = ['-date_joined',]

    fieldsets = UserAdmin.fieldsets + (
        ('自定义信息', {
            'fields': ('user_type', 'phone', 'avatar', 'points')
        }),
    )

    add_fieldsets = UserAdmin.add_fieldsets + (
        ('自定义信息', {
            'fields': ('user_type', 'phone', 'email')
        }),
    )


from .models import MembershipLevelConfig, PointsLog, PointsRule, MemberRecharge


@admin.register(MembershipLevelConfig)
class MembershipLevelConfigAdmin(admin.ModelAdmin):
    list_display = ['level', 'name', 'shop', 'min_points', 'discount_rate', 'is_active']
    list_filter = ['level', 'is_active', 'shop']
    search_fields = ['name']


@admin.register(PointsRule)
class PointsRuleAdmin(admin.ModelAdmin):
    list_display = ['rule_type', 'name', 'shop', 'is_active']
    list_filter = ['rule_type', 'is_active', 'shop']
    search_fields = ['name']


@admin.register(PointsLog)
class PointsLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'points_type', 'points', 'current_points', 'created_at']
    list_filter = ['points_type', 'created_at', 'shop']
    search_fields = ['user__username']
    readonly_fields = ['created_at']


@admin.register(MemberRecharge)
class MemberRechargeAdmin(admin.ModelAdmin):
    list_display = ['user', 'recharge_amount', 'gift_amount', 'payment_status', 'created_at']
    list_filter = ['payment_status', 'created_at', 'shop']
    search_fields = ['user__username']

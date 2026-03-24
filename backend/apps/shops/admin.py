from django.contrib import admin
from django.contrib.auth import get_user_model
from django_tenants.admin import TenantAdminMixin

from .models import Shop, Domain, ShopStaff, ShopSettings

User = get_user_model()


class ShopStaffInline(admin.TabularInline):
    """店铺员工内联管理"""
    model = ShopStaff
    extra = 0
    raw_id_fields = ('user',)
    fields = ('user', 'role', 'is_active', 'permissions')


@admin.register(Shop)
class ShopAdmin(TenantAdminMixin, admin.ModelAdmin):
    list_display = ('name', 'shop_type', 'is_active', 'created_at')
    list_filter = ('shop_type', 'is_active', 'created_at')
    search_fields = ('name', 'address', 'phone')
    filter_horizontal = ()
    inlines = [ShopStaffInline]

    fieldsets = (
        ('基础信息', {
            'fields': ('name', 'description', 'shop_type', 'is_active')
        }),
        ('联系信息', {
            'fields': ('address', 'phone', 'email')
        }),
        ('服务设置', {
            'fields': ('allow_delivery', 'allow_pickup', 'allow_dine_in')
        }),
        ('配送设置', {
            'fields': ('delivery_fee', 'minimum_order_amount', 'delivery_radius')
        }),
        ('多租户设置', {
            'fields': ('schema_name',)
        }),
    )

    def has_view_permission(self, request, obj=None):
        """控制查看权限"""
        if request.user.is_superuser:
            return True
        # 租户管理员可以查看自己管理的店铺
        if hasattr(request, 'tenant'):
            return ShopStaff.objects.filter(
                user=request.user,
                shop=request.tenant,
                is_active=True,
                role__in=['owner', 'manager']
            ).exists()
        return False

    def has_change_permission(self, request, obj=None):
        """控制编辑权限"""
        if request.user.is_superuser:
            return True
        # 只有店主和店长可以编辑
        if hasattr(request, 'tenant'):
            return ShopStaff.objects.filter(
                user=request.user,
                shop=request.tenant,
                is_active=True,
                role__in=['owner', 'manager']
            ).exists()
        return False

    def has_delete_permission(self, request, obj=None):
        """控制删除权限 - 只有超级管理员可以删除"""
        return request.user.is_superuser


from .models import Table


@admin.register(Table)
class TableAdmin(admin.ModelAdmin):
    list_display = ['table_number', 'table_name', 'shop', 'table_type', 'status', 'min_capacity', 'max_capacity']
    list_filter = ['table_type', 'status', 'shop']
    search_fields = ['table_number', 'table_name']

    actions = ['generate_qr_codes']

    def generate_qr_codes(self, request, queryset):
        for table in queryset:
            table.generate_qr_code()
        self.message_user(request, f"已为 {queryset.count()} 个桌台生成二维码")

    generate_qr_codes.short_description = "生成二维码"


admin.site.register(Domain)


@admin.register(ShopStaff)
class ShopStaffAdmin(TenantAdminMixin, admin.ModelAdmin):
    list_display = ('user', 'shop', 'role', 'is_active', 'created_at')
    list_filter = ('role', 'is_active', 'shop')
    search_fields = ('user__username', 'user__email', 'shop__name')
    raw_id_fields = ('user', 'shop')


@admin.register(ShopSettings)
class ShopSettingsAdmin(TenantAdminMixin, admin.ModelAdmin):
    list_display = ('shop', 'auto_confirm_order', 'points_enabled', 'updated_at')
    search_fields = ('shop__name',)

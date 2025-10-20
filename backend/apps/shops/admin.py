from django.contrib import admin
from django_tenants.admin import TenantAdminMixin

from .models import Shop, Domain, ShopStaff, ShopSettings


@admin.register(Shop)
class ShopAdmin(TenantAdminMixin, admin.ModelAdmin):
    list_display = ('name', 'shop_type', 'is_active', 'created_at')
    list_filter = ('shop_type', 'is_active', 'created_at')
    search_fields = ('name', 'address', 'phone')
    filter_horizontal = ()

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
admin.site.register(ShopStaff)
admin.site.register(ShopSettings)

from django.contrib import admin
from django.contrib.auth import get_user_model
from django.utils import timezone
from django_tenants.admin import TenantAdminMixin

from .models import Shop, Domain, ShopStaff, ShopSettings, ShopApply, Table

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


@admin.register(ShopApply)
class ShopApplyAdmin(admin.ModelAdmin):
    list_display = ['shop_name', 'contact_name', 'contact_phone', 'status', 'created_at']
    list_filter = ['status', 'shop_type', 'created_at']
    search_fields = ['shop_name', 'contact_name', 'contact_phone', 'contact_email']
    readonly_fields = ['contact_name', 'contact_phone', 'contact_email',
                       'shop_name', 'shop_type', 'shop_address', 'shop_description',
                       'created_at']
    actions = ['approve_applies', 'reject_applies']

    fieldsets = (
        ('申请人信息', {
            'fields': ('contact_name', 'contact_phone', 'contact_email'),
        }),
        ('店铺信息', {
            'fields': ('shop_name', 'shop_type', 'shop_address', 'shop_description'),
        }),
        ('审核信息', {
            'fields': ('status', 'review_remark', 'reviewer', 'reviewed_at'),
        }),
    )

    def approve_applies(self, request, queryset):
        """审核通过：创建店铺、账号、员工记录、设置"""
        from django.contrib.auth.hashers import make_password

        pending = queryset.filter(status='pending')
        count = 0
        for apply in pending:
            try:
                # 1. 创建店主用户
                username = f"owner_{apply.shop_name[:10]}_{apply.id}"
                base_username = username
                counter = 1
                while User.objects.filter(username=username).exists():
                    username = f"{base_username}_{counter}"
                    counter += 1

                owner = User.objects.create_user(
                    username=username,
                    email=apply.contact_email,
                    phone=apply.contact_phone,
                    password=apply.account_password,
                    user_type='shop_owner',
                )

                # 2. 创建店铺（Tenant）
                import re
                schema_name = re.sub(r'[^a-zA-Z0-9_]', '_', f"shop_{apply.shop_name[:20]}_{apply.id}")
                shop = Shop.objects.create(
                    schema_name=schema_name,
                    name=apply.shop_name,
                    shop_type=apply.shop_type,
                    address=apply.shop_address or '',
                    description=apply.shop_description or '',
                    phone=apply.contact_phone,
                    email=apply.contact_email,
                )

                # 3. 创建店主员工记录
                ShopStaff.objects.create(
                    user=owner,
                    shop=shop,
                    role='owner',
                    permissions={'all': True},
                )

                # 4. 创建店铺设置
                ShopSettings.objects.create(shop=shop)

                # 5. 更新申请状态
                apply.status = 'approved'
                apply.reviewer = request.user
                apply.reviewed_at = timezone.now()
                apply.save()

                count += 1
            except Exception as e:
                self.message_user(request, f'审核 [{apply.shop_name}] 失败: {e}', level='ERROR')

        if count:
            self.message_user(request, f'已通过 {count} 个入驻申请')

    approve_applies.short_description = '✅ 通过选中的入驻申请'

    def reject_applies(self, request, queryset):
        """拒绝入驻申请"""
        updated = queryset.filter(status='pending').update(
            status='rejected',
            reviewer=request.user,
            reviewed_at=timezone.now(),
        )
        self.message_user(request, f'已拒绝 {updated} 个入驻申请')

    reject_applies.short_description = '❌ 拒绝选中的入驻申请'

    def has_add_permission(self, request):
        return False  # 仅通过前台提交

    def get_readonly_fields(self, request, obj=None):
        if obj and obj.status != 'pending':
            return self.readonly_fields + ['review_remark']
        return self.readonly_fields

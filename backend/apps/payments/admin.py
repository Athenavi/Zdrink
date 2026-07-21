from django.contrib import admin

from .models import PaymentMethod, PaymentTransaction, RefundRequest, WechatPayConfig, AlipayConfig


@admin.register(PaymentMethod)
class PaymentMethodAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'shop', 'is_active', 'sort_order']
    list_filter = ['code', 'is_active', 'shop']
    search_fields = ['name', 'code']

@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(admin.ModelAdmin):
    list_display = ['transaction_no', 'order', 'payment_method', 'amount', 'status', 'created_at']
    list_filter = ['status', 'payment_method', 'created_at']
    search_fields = ['transaction_no', 'order__order_number']
    readonly_fields = ['transaction_no', 'created_at', 'updated_at']

@admin.register(RefundRequest)
class RefundRequestAdmin(admin.ModelAdmin):
    list_display = ['refund_no', 'transaction', 'refund_amount', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['refund_no', 'transaction__transaction_no']

@admin.register(WechatPayConfig)
class WechatPayConfigAdmin(admin.ModelAdmin):
    list_display = ['shop', 'app_id', 'mch_id', 'api_key_preview', 'is_active']
    list_filter = ['is_active']
    readonly_fields = ('api_key', 'cert_path', 'key_path')

    def api_key_preview(self, obj):
        if obj.api_key:
            return f"已配置 ({obj.api_key[:6]}****)"
        return '未配置'

    api_key_preview.short_description = 'API密钥'

@admin.register(AlipayConfig)
class AlipayConfigAdmin(admin.ModelAdmin):
    list_display = ['shop', 'app_id', 'private_key_preview', 'is_active']
    list_filter = ['is_active']
    readonly_fields = ('app_private_key',)

    def private_key_preview(self, obj):
        if obj.app_private_key:
            return f"已配置 ({obj.app_private_key[:20]}****)"
        return '未配置'

    private_key_preview.short_description = '应用私钥'

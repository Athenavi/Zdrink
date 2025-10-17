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
    list_display = ['shop', 'app_id', 'mch_id', 'is_active']
    list_filter = ['is_active']

@admin.register(AlipayConfig)
class AlipayConfigAdmin(admin.ModelAdmin):
    list_display = ['shop', 'app_id', 'is_active']
    list_filter = ['is_active']
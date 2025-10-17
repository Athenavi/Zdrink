from django.contrib import admin
from django.utils.html import format_html

from .models import Cart, CartItem, Order, OrderItem, OrderStatusLog, OrderPayment


class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0
    readonly_fields = ['unit_price', 'total_price']


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'total_price', 'total_quantity', 'created_at']
    list_filter = ['created_at']
    inlines = [CartItemInline]
    readonly_fields = ['total_price', 'total_quantity']


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ['unit_price', 'total_price']


class OrderStatusLogInline(admin.TabularInline):
    model = OrderStatusLog
    extra = 0
    readonly_fields = ['created_at']


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = [
        'order_number', 'customer_name', 'customer_phone', 'status',
        'order_type', 'total_amount', 'created_at', 'order_actions'  # 修改这里
    ]
    list_filter = ['status', 'order_type', 'payment_status', 'created_at', 'shop']
    search_fields = ['order_number', 'customer_name', 'customer_phone']
    readonly_fields = ['order_number', 'created_at', 'updated_at']
    inlines = [OrderItemInline, OrderStatusLogInline]

    fieldsets = (
        ('订单信息', {
            'fields': ('order_number', 'status', 'order_type', 'shop')
        }),
        ('价格信息', {
            'fields': ('subtotal', 'delivery_fee', 'discount_amount', 'total_amount')
        }),
        ('客户信息', {
            'fields': ('customer_name', 'customer_phone', 'customer_notes')
        }),
        ('配送/自取信息', {
            'fields': ('delivery_address', 'delivery_time', 'pickup_time', 'table_number')
        }),
        ('支付信息', {
            'fields': ('payment_method', 'payment_status', 'paid_at')
        }),
        ('时间信息', {
            'fields': ('created_at', 'updated_at', 'completed_at')
        }),
    )

    def order_actions(self, obj):  # 修改方法名
        return format_html(
            '<a href="/admin/orders/order/{}/change/">查看</a>',
            obj.id
        )

    order_actions.short_description = '操作'  # 更新描述


@admin.register(OrderPayment)
class OrderPaymentAdmin(admin.ModelAdmin):
    list_display = ['order', 'payment_method', 'payment_status', 'amount', 'created_at']
    list_filter = ['payment_method', 'payment_status', 'created_at']
    search_fields = ['order__order_number', 'transaction_id']
    readonly_fields = ['created_at', 'updated_at']


admin.site.register(CartItem)
admin.site.register(OrderStatusLog)
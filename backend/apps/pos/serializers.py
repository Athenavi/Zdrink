from decimal import Decimal

from rest_framework import serializers


class QuickOrderItemSerializer(serializers.Serializer):
    """快速订单商品序列化器"""
    product_id = serializers.IntegerField()
    sku_id = serializers.IntegerField(required=False, allow_null=True)
    quantity = serializers.IntegerField(min_value=1, default=1)
    attribute_selections = serializers.DictField(required=False, default=dict)
    customization = serializers.CharField(required=False, allow_blank=True)

class QuickOrderSerializer(serializers.Serializer):
    """快速订单序列化器"""
    order_type = serializers.ChoiceField(
        choices=[('dine_in', '堂食'), ('takeaway', '自取')],
        default='dine_in'
    )
    customer_name = serializers.CharField(max_length=100, default='散客')
    customer_phone = serializers.CharField(required=False, allow_blank=True)
    table_number = serializers.CharField(required=False, allow_blank=True)
    payment_method = serializers.CharField(default='cash')
    items = QuickOrderItemSerializer(many=True)
    apply_discount = serializers.BooleanField(default=False)
    discount_type = serializers.ChoiceField(
        choices=[('percentage', '百分比'), ('fixed', '固定金额')],
        required=False
    )
    discount_value = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        min_value=Decimal('0.00')
    )

class BarcodeScanSerializer(serializers.Serializer):
    """条码扫描序列化器"""
    barcode = serializers.CharField(max_length=100)

class TableStatusSerializer(serializers.Serializer):
    """桌台状态序列化器"""
    table_id = serializers.IntegerField()
    status = serializers.ChoiceField(choices=[
        ('available', '空闲'),
        ('occupied', '占用'),
        ('reserved', '预订'),
        ('cleaning', '清洁中')
    ])
    order_id = serializers.IntegerField(required=False)

class OrderSplitSerializer(serializers.Serializer):
    """订单拆分序列化器"""
    order_id = serializers.IntegerField()
    split_items = serializers.ListField(
        child=serializers.DictField(),
        min_length=1
    )

class OrderMergeSerializer(serializers.Serializer):
    """订单合并序列化器"""
    main_order_id = serializers.IntegerField()
    merge_order_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1
    )

class POSStatisticsSerializer(serializers.Serializer):
    """POS统计序列化器"""
    date = serializers.DateField()
    total_orders = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    average_order_value = serializers.DecimalField(max_digits=10, decimal_places=2)
    payment_methods = serializers.DictField()

class CashierShiftSerializer(serializers.Serializer):
    """收银班次序列化器"""
    shift_number = serializers.CharField()
    cashier_id = serializers.IntegerField()
    start_amount = serializers.DecimalField(max_digits=10, decimal_places=2, default=0)
    end_amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    notes = serializers.CharField(required=False, allow_blank=True)
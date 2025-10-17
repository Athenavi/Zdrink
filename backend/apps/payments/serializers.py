from rest_framework import serializers

from .models import PaymentMethod, PaymentTransaction, RefundRequest, WechatPayConfig, AlipayConfig


class PaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMethod
        fields = '__all__'
        read_only_fields = ('shop',)


class PaymentTransactionSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source='order.order_number', read_only=True)
    payment_method_name = serializers.CharField(source='payment_method.name', read_only=True)

    class Meta:
        model = PaymentTransaction
        fields = '__all__'
        read_only_fields = ('transaction_no', 'out_trade_no', 'payment_data', 'refund_data')


class CreatePaymentSerializer(serializers.Serializer):
    """创建支付序列化器"""
    order_id = serializers.IntegerField()
    payment_method_id = serializers.IntegerField()
    openid = serializers.CharField(required=False, allow_blank=True)  # 微信支付需要

    def validate(self, data):
        from apps.orders.models import Order
        from .models import PaymentMethod

        # 验证订单
        try:
            order = Order.objects.get(
                id=data['order_id'],
                shop=self.context['request'].tenant
            )
            data['order'] = order
        except Order.DoesNotExist:
            raise serializers.ValidationError("订单不存在")

        # 验证支付方式
        try:
            payment_method = PaymentMethod.objects.get(
                id=data['payment_method_id'],
                shop=self.context['request'].tenant,
                is_active=True
            )
            data['payment_method'] = payment_method
        except PaymentMethod.DoesNotExist:
            raise serializers.ValidationError("支付方式不可用")

        return data


class RefundRequestSerializer(serializers.ModelSerializer):
    transaction_info = serializers.SerializerMethodField()

    class Meta:
        model = RefundRequest
        fields = '__all__'
        read_only_fields = ('refund_no', 'status', 'handled_by', 'handled_at', 'reject_reason')

    def get_transaction_info(self, obj):
        return {
            'transaction_no': obj.transaction.transaction_no,
            'order_number': obj.transaction.order.order_number,
            'amount': obj.transaction.amount
        }


class WechatPayConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = WechatPayConfig
        fields = '__all__'
        read_only_fields = ('shop',)


class AlipayConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = AlipayConfig
        fields = '__all__'
        read_only_fields = ('shop',)


class PaymentCallbackSerializer(serializers.Serializer):
    """支付回调序列化器"""
    transaction_no = serializers.CharField()
    status = serializers.ChoiceField(choices=['success', 'failed'])
    message = serializers.CharField(required=False, allow_blank=True)
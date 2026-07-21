from rest_framework import serializers

from .models import PaymentMethod, PaymentTransaction, RefundRequest, WechatPayConfig, AlipayConfig


class PaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMethod
        exclude = ('config',)
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
    payment_method_id = serializers.IntegerField(required=False)
    payment_method = serializers.CharField(required=False)  # 支持 'wechat', 'alipay', 'cash'
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

        # 验证支付方式 - 支持ID或代码
        payment_method = None

        if 'payment_method_id' in data and data['payment_method_id']:
            # 使用ID查找
            try:
                payment_method = PaymentMethod.objects.get(
                    id=data['payment_method_id'],
                    shop=self.context['request'].tenant,
                    is_active=True
                )
            except PaymentMethod.DoesNotExist:
                raise serializers.ValidationError("支付方式不存在")
        elif 'payment_method' in data and data['payment_method']:
            # 使用代码查找
            try:
                payment_method = PaymentMethod.objects.get(
                    code=data['payment_method'],
                    shop=self.context['request'].tenant,
                    is_active=True
                )
            except PaymentMethod.DoesNotExist:
                raise serializers.ValidationError(f"支付方式 '{data['payment_method']}' 不可用")
        else:
            raise serializers.ValidationError("请提供支付方式ID或代码")

        data['payment_method'] = payment_method
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
    api_key_configured = serializers.SerializerMethodField()

    class Meta:
        model = WechatPayConfig
        fields = ['id', 'shop', 'app_id', 'mch_id', 'api_key_configured', 'api_key', 'cert_path', 'key_path',
                  'enable_jsapi', 'enable_miniprogram', 'enable_app', 'enable_wap', 'enable_pc',
                  'notify_url', 'refund_url', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ('shop',)
        extra_kwargs = {
            'api_key': {'write_only': True},
            'cert_path': {'write_only': True},
            'key_path': {'write_only': True},
        }

    def get_api_key_configured(self, obj):
        return bool(obj.api_key)


class AlipayConfigSerializer(serializers.ModelSerializer):
    app_private_key_configured = serializers.SerializerMethodField()

    class Meta:
        model = AlipayConfig
        fields = ['id', 'shop', 'app_id', 'app_private_key_configured', 'app_private_key', 'alipay_public_key',
                  'enable_app', 'enable_wap', 'enable_pc',
                  'notify_url', 'return_url', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ('shop',)
        extra_kwargs = {
            'app_private_key': {'write_only': True},
        }

    def get_app_private_key_configured(self, obj):
        return bool(obj.app_private_key)


class PaymentCallbackSerializer(serializers.Serializer):
    """支付回调序列化器"""
    transaction_no = serializers.CharField()
    status = serializers.ChoiceField(choices=['success', 'failed'])
    message = serializers.CharField(required=False, allow_blank=True)
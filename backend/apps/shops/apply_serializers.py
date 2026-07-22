"""商家入驻申请序列化器"""
from django.contrib.auth.hashers import make_password
from rest_framework import serializers

from .models import ShopApply


class ShopApplySerializer(serializers.ModelSerializer):
    """提交入驻申请——包含密码设置"""
    confirm_password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = ShopApply
        fields = [
            'contact_name', 'contact_phone', 'contact_email',
            'shop_name', 'shop_type', 'shop_address', 'shop_description',
            'account_password', 'confirm_password',
        ]
        extra_kwargs = {
            'account_password': {'write_only': True, 'min_length': 6},
        }

    def validate_contact_phone(self, value):
        import re
        if not re.match(r'^1\d{10}$', value):
            raise serializers.ValidationError('手机号格式不正确')
        return value

    def validate(self, attrs):
        password = attrs.get('account_password')
        confirm = attrs.pop('confirm_password', '')
        if password != confirm:
            raise serializers.ValidationError({'confirm_password': '两次输入的密码不一致'})
        # 加密存储密码
        attrs['account_password'] = make_password(password)
        return attrs


class ShopApplyDetailSerializer(serializers.ModelSerializer):
    """查看入驻申请详情（不含密码，用于 setup 页面回显）"""
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = ShopApply
        fields = [
            'id', 'contact_name', 'contact_phone', 'contact_email',
            'shop_name', 'shop_type', 'shop_address', 'shop_description',
            'status', 'status_display', 'review_remark',
            'setup_completed', 'created_at', 'reviewed_at',
        ]


class ShopApplyListSerializer(serializers.ModelSerializer):
    """查看入驻申请记录"""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    setup_url = serializers.SerializerMethodField()

    class Meta:
        model = ShopApply
        fields = [
            'id', 'shop_name', 'shop_type', 'status', 'status_display',
            'review_remark', 'setup_completed', 'setup_url',
            'created_at', 'reviewed_at',
        ]

    def get_setup_url(self, obj):
        """仅对已通过且未完成设置的申请返回设置链接"""
        if obj.status == 'approved' and not obj.setup_completed and obj.setup_token:
            from django.conf import settings
            return f"{settings.FRONTEND_URL}/register/merchant/setup/{obj.setup_token}/"
        return None


class ShopApplySetupSerializer(serializers.Serializer):
    """入驻配置——提交店铺基础配置"""
    shop_name = serializers.CharField(max_length=200, required=False)
    shop_description = serializers.CharField(required=False, allow_blank=True)
    shop_address = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    opening_hours = serializers.JSONField(required=False)
    allow_delivery = serializers.BooleanField(required=False)
    allow_pickup = serializers.BooleanField(required=False)
    allow_dine_in = serializers.BooleanField(required=False)
    delivery_fee = serializers.DecimalField(max_digits=8, decimal_places=2, required=False)
    minimum_order_amount = serializers.DecimalField(max_digits=8, decimal_places=2, required=False)
    delivery_radius = serializers.IntegerField(required=False)
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)

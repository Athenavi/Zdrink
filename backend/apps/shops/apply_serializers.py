"""商家入驻申请序列化器"""
from rest_framework import serializers

from .models import ShopApply


class ShopApplySerializer(serializers.ModelSerializer):
    """提交入驻申请"""
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

    def validate(self, data):
        if data['account_password'] != data.pop('confirm_password'):
            raise serializers.ValidationError('两次输入的密码不一致')
        return data

    def validate_contact_phone(self, value):
        import re
        if not re.match(r'^1\d{10}$', value):
            raise serializers.ValidationError('手机号格式不正确')
        return value


class ShopApplyListSerializer(serializers.ModelSerializer):
    """查看入驻申请记录"""
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = ShopApply
        fields = [
            'id', 'shop_name', 'shop_type', 'status', 'status_display',
            'review_remark', 'created_at', 'reviewed_at',
        ]

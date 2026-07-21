"""商家入驻申请序列化器"""
from rest_framework import serializers

from .models import ShopApply


class ShopApplySerializer(serializers.ModelSerializer):
    """提交入驻申请（无需密码，审核通过后由系统通知设置）"""

    class Meta:
        model = ShopApply
        fields = [
            'contact_name', 'contact_phone', 'contact_email',
            'shop_name', 'shop_type', 'shop_address', 'shop_description',
        ]

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

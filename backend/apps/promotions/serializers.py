from rest_framework import serializers

from .models import Coupon, UserCoupon, CouponRule, Promotion


class CouponSerializer(serializers.ModelSerializer):
    is_available = serializers.BooleanField(read_only=True)

    class Meta:
        model = Coupon
        fields = '__all__'
        read_only_fields = ('shop', 'used_quantity')


class UserCouponSerializer(serializers.ModelSerializer):
    coupon_info = serializers.SerializerMethodField()

    class Meta:
        model = UserCoupon
        fields = '__all__'

    def get_coupon_info(self, obj):
        return CouponSerializer(obj.coupon).data


class CouponRuleSerializer(serializers.ModelSerializer):
    coupon_name = serializers.CharField(source='coupon.name', read_only=True)

    class Meta:
        model = CouponRule
        fields = '__all__'
        read_only_fields = ('shop',)


class PromotionSerializer(serializers.ModelSerializer):
    is_valid = serializers.BooleanField(read_only=True)

    class Meta:
        model = Promotion
        fields = '__all__'
        read_only_fields = ('shop',)


class ClaimCouponSerializer(serializers.Serializer):
    """领取优惠券序列化器"""
    coupon_code = serializers.CharField(max_length=50)


class ApplyCouponSerializer(serializers.Serializer):
    """应用优惠券序列化器"""
    coupon_code = serializers.CharField(max_length=50)
    order_id = serializers.IntegerField(required=False)
    cart_id = serializers.IntegerField(required=False)
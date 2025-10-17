from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import User, MembershipLevelConfig, PointsLog, PointsRule, MemberRecharge


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ('username', 'password', 'password2', 'email', 'phone', 'user_type')
        extra_kwargs = {
            'email': {'required': True},
            'phone': {'required': True}
        }

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "密码不匹配"})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        return user


class UserLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()

    def validate(self, data):
        username = data.get('username')
        password = data.get('password')

        if username and password:
            user = authenticate(username=username, password=password)
            if user:
                if not user.is_active:
                    raise serializers.ValidationError("用户账户已被禁用")
                data['user'] = user
                return data
            else:
                raise serializers.ValidationError("用户名或密码错误")
        else:
            raise serializers.ValidationError("必须提供用户名和密码")


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'phone', 'user_type',
                  'first_name', 'last_name', 'avatar', 'points',
                  'is_active', 'date_joined')
        read_only_fields = ('id', 'date_joined', 'points')


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('first_name', 'last_name', 'email', 'phone', 'avatar')


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    new_password2 = serializers.CharField(required=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password2']:
            raise serializers.ValidationError({"new_password": "新密码不匹配"})
        return attrs


class MembershipLevelConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = MembershipLevelConfig
        fields = '__all__'
        read_only_fields = ('shop',)


class PointsLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = PointsLog
        fields = '__all__'
        read_only_fields = ('user', 'shop', 'current_points')


class PointsRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = PointsRule
        fields = '__all__'
        read_only_fields = ('shop',)


class MemberRechargeSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = MemberRecharge
        fields = '__all__'
        read_only_fields = ('shop',)


class UserMembershipSerializer(serializers.ModelSerializer):
    """用户会员信息序列化器"""
    membership_level_name = serializers.CharField(source='get_membership_level_display', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'membership_level', 'membership_level_name',
            'membership_number', 'membership_expiry', 'total_points',
            'available_points', 'used_points', 'total_consumption',
            'consumption_count', 'referral_code'
        ]


class RechargeRequestSerializer(serializers.Serializer):
    """充值请求序列化器"""
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0.01)
    payment_method = serializers.CharField()


class PointsConsumeSerializer(serializers.Serializer):
    """积分消费序列化器"""
    points = serializers.IntegerField(min_value=1)
    order_id = serializers.IntegerField(required=False)

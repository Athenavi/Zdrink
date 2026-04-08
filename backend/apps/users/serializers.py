from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import User, MembershipLevelConfig, PointsLog, PointsRule, MemberRecharge, UserAddress


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ('username', 'password', 'password2', 'email', 'phone', 'user_type')
        extra_kwargs = {
            'email': {'required': True},
            'phone': {'required': False},  # 改为非必填
            'user_type': {'required': False, 'default': 'customer'}  # 设置默认值
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
    level_info = serializers.SerializerMethodField()
    next_level_info = serializers.SerializerMethodField()
    has_signed_in_today = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'membership_level', 'membership_level_name',
            'membership_number', 'membership_expiry', 'total_points',
            'available_points', 'used_points', 'total_consumption',
            'consumption_count', 'referral_code', 'level_info', 'next_level_info',
            'has_signed_in_today'
        ]

    def get_level_info(self, obj):
        """获取当前等级详细信息"""
        request = self.context.get('request')
        if not request or not hasattr(request, 'tenant'):
            return None

        try:
            from .models import MembershipLevelConfig
            level_config = MembershipLevelConfig.objects.get(
                shop=request.tenant,
                level=obj.membership_level,
                is_active=True
            )
            return {
                'name': level_config.name,
                'discount_rate': float(level_config.discount_rate),
                'points_earn_rate': float(level_config.points_earn_rate),
                'benefits': level_config.benefits,
                'min_points': level_config.min_points
            }
        except Exception:
            return None

    def get_next_level_info(self, obj):
        """获取下一等级信息"""
        request = self.context.get('request')
        if not request or not hasattr(request, 'tenant'):
            return None

        try:
            from .models import MembershipLevelConfig
            # 获取所有等级配置，按积分排序
            levels = MembershipLevelConfig.objects.filter(
                shop=request.tenant,
                is_active=True
            ).order_by('min_points')

            # 找到下一个等级（第一个min_points大于当前总积分的等级）
            for level in levels:
                if level.min_points > obj.total_points:
                    points_needed = level.min_points - obj.total_points
                    return {
                        'level': level.level,
                        'name': level.name,
                        'min_points': level.min_points,
                        'points_needed': points_needed,
                        'discount_rate': float(level.discount_rate),
                        'points_earn_rate': float(level.points_earn_rate),
                        'benefits': level.benefits
                    }

            # 遍历完所有等级都没有找到，说明已经是最高等级
            return None
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"获取下一等级信息失败: {str(e)}")
            return None

    def get_has_signed_in_today(self, obj):
        """检查今日是否已签到"""
        request = self.context.get('request')
        if not request or not hasattr(request, 'tenant'):
            return False

        try:
            from django.utils import timezone
            from .models import PointsLog

            today = timezone.now().date()
            today_log = PointsLog.objects.filter(
                user=obj,
                shop=request.tenant,
                points_type='earn_signin',
                created_at__date=today
            ).exists()

            return today_log
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"检查签到状态失败: {str(e)}")
            return False


class RechargeRequestSerializer(serializers.Serializer):
    """充值请求序列化器"""
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0.01)
    payment_method = serializers.CharField()


class PointsConsumeSerializer(serializers.Serializer):
    """积分消费序列化器"""
    points = serializers.IntegerField(min_value=1)
    order_id = serializers.IntegerField(required=False)


class UserAddressSerializer(serializers.ModelSerializer):
    """用户地址序列化器"""
    full_address = serializers.CharField(read_only=True)

    class Meta:
        model = UserAddress
        fields = [
            'id', 'name', 'phone', 'province', 'city', 'district',
            'detail', 'full_address', 'is_default', 'label',
            'created_at', 'updated_at'
        ]
        read_only_fields = ('user',)

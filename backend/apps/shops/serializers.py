from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Shop, ShopStaff, ShopSettings
from ..core.maps import calculate_distance

User = get_user_model()


class ShopSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShopSettings
        exclude = ('id', 'shop', 'created_at', 'updated_at')


class ShopSerializer(serializers.ModelSerializer):
    settings = ShopSettingsSerializer(read_only=True)
    distance = serializers.SerializerMethodField()

    class Meta:
        model = Shop
        fields = [
            'id', 'name', 'description', 'shop_type', 'address',
            'phone', 'email', 'logo', 'banner',
            'opening_hours', 'is_active',
            'allow_delivery', 'allow_pickup', 'allow_dine_in',
            'delivery_fee', 'minimum_order_amount', 'delivery_radius',
            'latitude', 'longitude',
            'payment_methods',
            'created_at', 'updated_at',
            'settings',
            'distance',
        ]
        read_only_fields = ('created_at', 'updated_at', 'schema_name')

    def get_distance(self, obj) -> float | None:
        """计算用户到店铺的距离（公里）"""
        request = self.context.get('request')
        if not request:
            return None

        try:
            user_lat = float(request.query_params.get('lat', 0) or 0)
            user_lng = float(request.query_params.get('lng', 0) or 0)
        except (ValueError, TypeError):
            return None

        if not user_lat or not user_lng:
            return None

        shop_lat = obj.latitude
        shop_lng = obj.longitude

        if shop_lat is None or shop_lng is None:
            return None

        return calculate_distance(
            user_lat, user_lng,
            float(shop_lat), float(shop_lng),
        )


class ShopCreateSerializer(serializers.ModelSerializer):
    admin_email = serializers.EmailField(write_only=True)
    admin_password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = Shop
        exclude = ('schema_name',)
        read_only_fields = ('created_at', 'updated_at')

    def validate(self, attrs):
        admin_email = attrs.pop('admin_email')
        admin_password = attrs.pop('admin_password')

        if User.objects.filter(email=admin_email).exists():
            raise serializers.ValidationError({"admin_email": "该邮箱已被使用"})

        attrs['admin_email'] = admin_email
        attrs['admin_password'] = admin_password
        return attrs

    def create(self, validated_data):
        admin_email = validated_data.pop('admin_email')
        admin_password = validated_data.pop('admin_password')

        # 创建店铺
        shop = Shop.objects.create(**validated_data)

        # 创建店主用户
        admin_user = User.objects.create_user(
            username=admin_email,
            email=admin_email,
            password=admin_password,
            user_type='shop_owner'
        )

        # 关联店铺员工
        ShopStaff.objects.create(
            user=admin_user,
            shop=shop,
            role='owner',
            permissions={'all': True}
        )

        # 创建店铺设置
        ShopSettings.objects.create(shop=shop)

        return shop


class ShopStaffSerializer(serializers.ModelSerializer):
    user_info = serializers.SerializerMethodField()
    shop_name = serializers.CharField(source='shop.name', read_only=True)

    class Meta:
        model = ShopStaff
        fields = '__all__'
        read_only_fields = ('role', 'permissions', 'created_at', 'updated_at')

    def get_user_info(self, obj):
        return {
            'id': obj.user.id,
            'username': obj.user.username,
            'email': obj.user.email,
            'phone': obj.user.phone
        }


class ShopStaffCreateSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(write_only=True)
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = ShopStaff
        fields = ('email', 'password', 'role', 'permissions')

    def validate_role(self, value):
        """非超级管理员不能创建 owner 角色"""
        request = self.context.get('request')
        if request and request.user.user_type != 'super_admin':
            if value == 'owner':
                raise serializers.ValidationError('无权创建店主角色')
        return value

    def validate(self, attrs):
        email = attrs.get('email')

        # 如果用户不存在，需要密码
        if not User.objects.filter(email=email).exists() and not attrs.get('password'):
            raise serializers.ValidationError({"password": "新用户必须设置密码"})

        return attrs

    def create(self, validated_data):
        email = validated_data.pop('email')
        password = validated_data.pop('password', None)

        # 获取或创建用户
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': email,
                'user_type': 'shop_staff',
                'password': password if password else User.objects.make_random_password()
            }
        )

        if created and password:
            user.set_password(password)
            user.save()

        # 创建员工记录
        shop_staff = ShopStaff.objects.create(user=user, **validated_data)
        return shop_staff
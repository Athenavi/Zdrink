"""验证码登录序列化器"""
from django.contrib.auth import get_user_model
from rest_framework import serializers

from .verify_services import verify_code, get_login_mode

User = get_user_model()


class SendCodeSerializer(serializers.Serializer):
    """发送验证码请求"""
    phone = serializers.CharField(max_length=15, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    purpose = serializers.ChoiceField(choices=['login', 'register', 'bind'], default='login')

    def validate(self, data):
        phone = data.get('phone', '')
        email = data.get('email', '')

        if not phone and not email:
            raise serializers.ValidationError('手机号和邮箱至少填一个')

        mode = get_login_mode()

        if phone and not mode['phone']:
            raise serializers.ValidationError('手机验证码登录未启用')

        if email and not mode['email']:
            raise serializers.ValidationError('邮箱验证码登录未启用')

        # 根据模式校验
        if mode['mode'] == 'phone_only' and email:
            raise serializers.ValidationError('当前仅支持手机验证码登录')
        if mode['mode'] == 'email_only' and phone:
            raise serializers.ValidationError('当前仅支持邮箱验证码登录')

        if phone:
            # 简单校验手机号格式（11位数字）
            import re
            if not re.match(r'^1\d{10}$', phone):
                raise serializers.ValidationError('手机号格式不正确')

        return data


class LoginByCodeSerializer(serializers.Serializer):
    """验证码登录请求"""
    phone = serializers.CharField(max_length=15, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    code = serializers.CharField(max_length=10)

    def validate(self, data):
        phone = data.get('phone', '')
        email = data.get('email', '')
        code = data.get('code', '')

        if not phone and not email:
            raise serializers.ValidationError('手机号和邮箱至少填一个')

        mode = get_login_mode()
        if not mode['enabled']:
            raise serializers.ValidationError('验证码登录功能未启用')

        # 校验验证码
        if not verify_code(phone=phone, email=email, code=code, purpose='login'):
            raise serializers.ValidationError('验证码错误或已过期')

        # 查找或创建用户
        if phone:
            user = User.objects.filter(phone=phone).first()
        else:
            user = User.objects.filter(email=email).first()

        if not user:
            # 自动注册：用手机号或邮箱创建用户
            username = phone if phone else email.split('@')[0]
            # 确保用户名唯一
            base_username = username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f'{base_username}_{counter}'
                counter += 1

            user = User.objects.create_user(
                username=username,
                email=email or '',
                phone=phone or '',
                password=User.objects.make_random_password(),
            )

        if not user.is_active:
            raise serializers.ValidationError('该账户已被停用')

        data['user'] = user
        return data

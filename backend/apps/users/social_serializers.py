"""
第三方登录序列化器
"""
from rest_framework import serializers


class SocialAuthCallbackSerializer(serializers.Serializer):
    """第三方登录回调序列化器"""
    code = serializers.CharField(required=True, help_text='授权码')
    provider = serializers.ChoiceField(
        choices=['weixin', 'alipay'],
        required=True,
        help_text='登录提供商'
    )
    platform = serializers.ChoiceField(
        choices=['pc', 'mobile'],
        default='pc',
        required=False,
        help_text='平台类型'
    )


class SocialBindSerializer(serializers.Serializer):
    """绑定第三方账号序列化器"""
    provider = serializers.ChoiceField(
        choices=['weixin', 'alipay'],
        required=True,
        help_text='登录提供商'
    )
    code = serializers.CharField(required=True, help_text='授权码')


class SocialUnbindSerializer(serializers.Serializer):
    """解绑第三方账号序列化器"""
    provider = serializers.ChoiceField(
        choices=['weixin', 'alipay'],
        required=True,
        help_text='登录提供商'
    )

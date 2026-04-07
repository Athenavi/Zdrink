"""
第三方登录API视图
提供微信、支付宝等第三方登录接口

使用方法：
1. 在 .env 文件中配置微信和支付宝的 AppID、AppSecret
2. 在微信开放平台/支付宝开放平台创建应用并配置回调地址
3. 前端调用 /api/users/social/weixin/login/ 或 /api/users/social/alipay/login/ 获取授权URL
4. 用户授权后，回调到 /auth/callback/weixin 或 /auth/callback/alipay
5. 回调页面使用 code 调用 /api/users/social/callback/ 完成登录

API 端点：
- GET  /api/users/social/weixin/login/ - 获取微信授权URL
- GET  /api/users/social/alipay/login/ - 获取支付宝授权URL
- POST /api/users/social/callback/ - 处理第三方登录回调
- POST /api/users/social/bind/ - 绑定第三方账号（需登录）
- POST /api/users/social/unbind/ - 解绑第三方账号（需登录）
- GET  /api/users/social/bindings/ - 获取已绑定的第三方账号列表（需登录）
"""
import requests
from django.conf import settings
from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import SocialAuth
from .serializers import UserSerializer
from .social_serializers import (
    SocialAuthCallbackSerializer,
    SocialBindSerializer,
    SocialUnbindSerializer
)


class WeixinLoginView(APIView):
    """微信登录 - 获取授权URL"""
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request):
        """获取微信授权URL"""
        platform = request.query_params.get('platform', 'pc')
        redirect_uri = request.query_params.get('redirect_uri', '')

        if not redirect_uri:
            redirect_uri = f"{settings.FRONTEND_URL}/auth/callback/weixin"

        # 构建授权URL
        if platform == 'mobile':
            auth_url = (
                f"https://open.weixin.qq.com/connect/oauth2/authorize?"
                f"appid={settings.SOCIAL_AUTH_WEIXIN_KEY}&"
                f"redirect_uri={redirect_uri}&"
                f"response_type=code&"
                f"scope={settings.SOCIAL_AUTH_WEIXIN_SCOPE}&"
                f"state=RANDOM_STATE#wechat_redirect"
            )
        else:
            auth_url = (
                f"https://open.weixin.qq.com/connect/qrconnect?"
                f"appid={settings.SOCIAL_AUTH_WEIXIN_KEY}&"
                f"redirect_uri={redirect_uri}&"
                f"response_type=code&"
                f"scope={settings.SOCIAL_AUTH_WEIXIN_SCOPE}&"
                f"state=RANDOM_STATE"
            )

        return Response({
            'auth_url': auth_url,
            'provider': 'weixin',
            'platform': platform
        })


class AlipayLoginView(APIView):
    """支付宝登录 - 获取授权URL"""
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request):
        """获取支付宝授权URL"""
        redirect_uri = request.query_params.get('redirect_uri', '')

        if not redirect_uri:
            redirect_uri = f"{settings.FRONTEND_URL}/auth/callback/alipay"

        # 构建授权URL
        from urllib.parse import urlencode

        params = {
            'app_id': settings.SOCIAL_AUTH_ALIPAY_KEY,
            'scope': settings.SOCIAL_AUTH_ALIPAY_SCOPE,
            'redirect_uri': redirect_uri,
        }

        auth_url = f"https://openauth.alipay.com/oauth2/publicAppAuthorize.htm?{urlencode(params)}"

        return Response({
            'auth_url': auth_url,
            'provider': 'alipay'
        })


class SocialCallbackView(APIView):
    """第三方登录回调处理"""
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        """处理第三方登录回调"""
        serializer = SocialAuthCallbackSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        code = serializer.validated_data['code']
        provider = serializer.validated_data['provider']
        platform = serializer.validated_data.get('platform', 'pc')

        try:
            if provider == 'weixin':
                user, is_new = self._handle_weixin_callback(code, platform)
            elif provider == 'alipay':
                user, is_new = self._handle_alipay_callback(code)
            else:
                return Response(
                    {'error': '不支持的登录方式'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # 生成JWT Token
            refresh = RefreshToken.for_user(user)

            return Response({
                'user': UserSerializer(user).data,
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'is_new': is_new,
                'message': '新用户注册成功' if is_new else '登录成功'
            })

        except Exception as e:
            return Response(
                {'error': f'登录失败: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    def _handle_weixin_callback(self, code, platform='pc'):
        """处理微信回调"""
        # 1. 使用code换取access_token和openid
        token_url = 'https://api.weixin.qq.com/sns/oauth2/access_token'
        token_params = {
            'appid': settings.SOCIAL_AUTH_WEIXIN_KEY,
            'secret': settings.SOCIAL_AUTH_WEIXIN_SECRET,
            'code': code,
            'grant_type': 'authorization_code'
        }

        token_response = requests.get(token_url, params=token_params, timeout=10)
        token_data = token_response.json()

        if 'errcode' in token_data:
            raise Exception(f"微信授权失败: {token_data.get('errmsg', '未知错误')}")

        access_token = token_data['access_token']
        openid = token_data['openid']
        unionid = token_data.get('unionid', '')

        # 2. 获取用户信息
        userinfo_url = 'https://api.weixin.qq.com/sns/userinfo'
        userinfo_params = {
            'access_token': access_token,
            'openid': openid,
            'lang': 'zh_CN'
        }

        userinfo_response = requests.get(userinfo_url, params=userinfo_params, timeout=10)
        userinfo_data = userinfo_response.json()

        if 'errcode' in userinfo_data:
            raise Exception(f"获取微信用户信息失败: {userinfo_data.get('errmsg', '未知错误')}")

        # 3. 查找或创建用户
        social_auth = SocialAuth.objects.filter(
            provider='weixin',
            openid=openid
        ).first()

        is_new = False

        if social_auth:
            user = social_auth.user
            # 更新额外数据
            social_auth.extra_data = userinfo_data
            social_auth.save(update_fields=['extra_data'])
        else:
            # 尝试通过unionid查找
            if unionid:
                social_auth_by_unionid = SocialAuth.objects.filter(
                    provider='weixin',
                    unionid=unionid
                ).first()

                if social_auth_by_unionid:
                    social_auth_by_unionid.openid = openid
                    social_auth_by_unionid.save(update_fields=['openid'])
                    user = social_auth_by_unionid.user
                else:
                    user = self._create_user_from_weixin(userinfo_data)
                    is_new = True
            else:
                user = self._create_user_from_weixin(userinfo_data)
                is_new = True

            # 创建绑定关系
            SocialAuth.objects.create(
                user=user,
                provider='weixin',
                openid=openid,
                unionid=unionid,
                extra_data=userinfo_data
            )

        # 更新用户模型字段
        user.wechat_openid = openid
        if unionid:
            user.wechat_unionid = unionid
        if not user.avatar and userinfo_data.get('headimgurl'):
            user.avatar = userinfo_data.get('headimgurl')
        user.save(update_fields=['wechat_openid', 'wechat_unionid', 'avatar'])

        return user, is_new

    def _handle_alipay_callback(self, code):
        """处理支付宝回调"""
        # 1. 使用code换取access_token
        from datetime import datetime
        import base64
        from Crypto.PublicKey import RSA
        from Crypto.Signature import pkcs1_15
        from Crypto.Hash import SHA256

        # 构建请求参数
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        params = {
            'app_id': settings.SOCIAL_AUTH_ALIPAY_KEY,
            'method': 'alipay.system.oauth.token',
            'charset': 'utf-8',
            'sign_type': 'RSA2',
            'timestamp': timestamp,
            'version': '1.0',
            'grant_type': 'authorization_code',
            'code': code,
        }

        # 生成签名
        sorted_params = sorted(params.items())
        sign_string = '&'.join([f"{k}={v}" for k, v in sorted_params if v])

        private_key_str = settings.SOCIAL_AUTH_ALIPAY_SECRET
        if '-----BEGIN RSA PRIVATE KEY-----' not in private_key_str:
            private_key_str = '-----BEGIN RSA PRIVATE KEY-----\n' + private_key_str + '\n-----END RSA PRIVATE KEY-----'

        private_key = RSA.import_key(private_key_str.encode())
        h = SHA256.new(sign_string.encode('utf-8'))
        signature = pkcs1_15.new(private_key).sign(h)
        params['sign'] = base64.b64encode(signature).decode('utf-8')

        # 发送请求
        token_response = requests.post(
            'https://openapi.alipay.com/gateway.do',
            data=params,
            timeout=10
        )
        token_data = token_response.json()

        if 'error_response' in token_data:
            raise Exception(f"支付宝授权失败: {token_data['error_response'].get('sub_msg', '未知错误')}")

        token_response_data = token_data.get('alipay_system_oauth_token_response', {})
        access_token = token_response_data.get('access_token')
        user_id = token_response_data.get('user_id')

        if not user_id:
            raise Exception("无法获取支付宝用户ID")

        # 2. 查找或创建用户
        social_auth = SocialAuth.objects.filter(
            provider='alipay',
            openid=user_id
        ).first()

        is_new = False

        if social_auth:
            user = social_auth.user
            social_auth.extra_data = token_data
            social_auth.save(update_fields=['extra_data'])
        else:
            user = self._create_user_from_alipay(user_id)
            is_new = True

            SocialAuth.objects.create(
                user=user,
                provider='alipay',
                openid=user_id,
                extra_data=token_data
            )

        # 更新用户模型
        user.alipay_user_id = user_id
        user.save(update_fields=['alipay_user_id'])

        return user, is_new

    def _create_user_from_weixin(self, userinfo_data):
        """从微信数据创建用户"""
        from django.contrib.auth import get_user_model

        User = get_user_model()
        openid = userinfo_data.get('openid')
        nickname = userinfo_data.get('nickname', f'微信用户_{openid[:8]}')
        avatar = userinfo_data.get('headimgurl', '')

        username = f"wx_{openid}"

        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"wx_{openid}_{counter}"
            counter += 1

        user = User.objects.create_user(
            username=username,
            email='',
            password=User.objects.make_random_password(),
            first_name=nickname,
        )

        if avatar:
            user.avatar = avatar

        user.save(update_fields=['avatar'])

        return user

    def _create_user_from_alipay(self, user_id):
        """从支付宝数据创建用户"""
        from django.contrib.auth import get_user_model

        User = get_user_model()
        username = f"alipay_{user_id}"

        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"alipay_{user_id}_{counter}"
            counter += 1

        user = User.objects.create_user(
            username=username,
            email='',
            password=User.objects.make_random_password(),
        )

        return user


class SocialBindView(APIView):
    """绑定第三方账号"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = SocialBindSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        provider = serializer.validated_data['provider']
        code = serializer.validated_data['code']
        user = request.user

        try:
            if provider == 'weixin':
                self._bind_weixin(user, code)
            elif provider == 'alipay':
                self._bind_alipay(user, code)
            else:
                return Response(
                    {'error': '不支持的绑定方式'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            return Response({'message': '绑定成功'})

        except Exception as e:
            return Response(
                {'error': f'绑定失败: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    def _bind_weixin(self, user, code):
        """绑定微信"""
        # 获取access_token和openid
        token_url = 'https://api.weixin.qq.com/sns/oauth2/access_token'
        token_params = {
            'appid': settings.SOCIAL_AUTH_WEIXIN_KEY,
            'secret': settings.SOCIAL_AUTH_WEIXIN_SECRET,
            'code': code,
            'grant_type': 'authorization_code'
        }

        token_response = requests.get(token_url, params=token_params, timeout=10)
        token_data = token_response.json()

        if 'errcode' in token_data:
            raise Exception(f"微信授权失败: {token_data.get('errmsg', '未知错误')}")

        openid = token_data['openid']
        unionid = token_data.get('unionid', '')

        # 检查是否已被其他账号绑定
        if SocialAuth.objects.filter(provider='weixin', openid=openid).exclude(user=user).exists():
            raise Exception("该微信账号已绑定其他用户")

        # 创建或更新绑定
        SocialAuth.objects.update_or_create(
            provider='weixin',
            openid=openid,
            defaults={
                'user': user,
                'unionid': unionid,
            }
        )

        # 更新用户模型
        user.wechat_openid = openid
        if unionid:
            user.wechat_unionid = unionid
        user.save(update_fields=['wechat_openid', 'wechat_unionid'])

    def _bind_alipay(self, user, code):
        """绑定支付宝"""
        from datetime import datetime
        import base64
        from Crypto.PublicKey import RSA
        from Crypto.Signature import pkcs1_15
        from Crypto.Hash import SHA256

        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        params = {
            'app_id': settings.SOCIAL_AUTH_ALIPAY_KEY,
            'method': 'alipay.system.oauth.token',
            'charset': 'utf-8',
            'sign_type': 'RSA2',
            'timestamp': timestamp,
            'version': '1.0',
            'grant_type': 'authorization_code',
            'code': code,
        }

        sorted_params = sorted(params.items())
        sign_string = '&'.join([f"{k}={v}" for k, v in sorted_params if v])

        private_key_str = settings.SOCIAL_AUTH_ALIPAY_SECRET
        if '-----BEGIN RSA PRIVATE KEY-----' not in private_key_str:
            private_key_str = '-----BEGIN RSA PRIVATE KEY-----\n' + private_key_str + '\n-----END RSA PRIVATE KEY-----'

        private_key = RSA.import_key(private_key_str.encode())
        h = SHA256.new(sign_string.encode('utf-8'))
        signature = pkcs1_15.new(private_key).sign(h)
        params['sign'] = base64.b64encode(signature).decode('utf-8')

        token_response = requests.post(
            'https://openapi.alipay.com/gateway.do',
            data=params,
            timeout=10
        )
        token_data = token_response.json()

        if 'error_response' in token_data:
            raise Exception(f"支付宝授权失败: {token_data['error_response'].get('sub_msg', '未知错误')}")

        user_id = token_data.get('alipay_system_oauth_token_response', {}).get('user_id')

        if not user_id:
            raise Exception("无法获取支付宝用户ID")

        # 检查是否已被其他账号绑定
        if SocialAuth.objects.filter(provider='alipay', openid=user_id).exclude(user=user).exists():
            raise Exception("该支付宝账号已绑定其他用户")

        # 创建或更新绑定
        SocialAuth.objects.update_or_create(
            provider='alipay',
            openid=user_id,
            defaults={'user': user}
        )

        # 更新用户模型
        user.alipay_user_id = user_id
        user.save(update_fields=['alipay_user_id'])


class SocialUnbindView(APIView):
    """解绑第三方账号"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = SocialUnbindSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        provider = serializer.validated_data['provider']
        user = request.user

        # 检查是否至少保留一种登录方式
        social_auths_count = SocialAuth.objects.filter(user=user).count()
        has_password = bool(user.password and user.password != '')

        if social_auths_count <= 1 and not has_password:
            return Response(
                {'error': '至少需要保留一种登录方式'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 删除绑定
        deleted_count, _ = SocialAuth.objects.filter(
            user=user,
            provider=provider
        ).delete()

        if deleted_count == 0:
            return Response(
                {'error': '未找到绑定关系'},
                status=status.HTTP_404_NOT_FOUND
            )

        # 清空用户模型中的对应字段
        if provider == 'weixin':
            user.wechat_openid = None
            user.wechat_unionid = None
            user.save(update_fields=['wechat_openid', 'wechat_unionid'])
        elif provider == 'alipay':
            user.alipay_user_id = None
            user.save(update_fields=['alipay_user_id'])

        return Response({'message': '解绑成功'})


class SocialBindingsView(APIView):
    """获取用户的第三方账号绑定列表"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        bindings = SocialAuth.objects.filter(user=request.user)

        data = []
        for binding in bindings:
            data.append({
                'provider': binding.provider,
                'provider_name': binding.get_provider_display(),
                'openid': binding.openid,
                'created_at': binding.created_at.isoformat(),
            })

        return Response({'bindings': data})

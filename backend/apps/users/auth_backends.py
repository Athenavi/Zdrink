"""
自定义第三方登录认证后端
支持微信和支付宝OAuth2.0登录
参考: social-auth-app-django, django-allauth
"""
from urllib.parse import urlencode

import requests
from django.contrib.auth import get_user_model
from social_core.backends.oauth import BaseOAuth2

from ..models import SocialAuth

User = get_user_model()


class WeixinOAuth2(BaseOAuth2):
    """微信OAuth2认证后端"""
    name = 'weixin'
    AUTHORIZATION_URL = 'https://open.weixin.qq.com/connect/qrconnect'
    ACCESS_TOKEN_URL = 'https://api.weixin.qq.com/sns/oauth2/access_token'
    OPENID_URL = 'https://api.weixin.qq.com/sns/userinfo'

    # 移动端H5登录URL
    MOBILE_AUTHORIZATION_URL = 'https://open.weixin.qq.com/connect/oauth2/authorize'
    MOBILE_ACCESS_TOKEN_URL = 'https://api.weixin.qq.com/sns/oauth2/access_token'
    MOBILE_OPENID_URL = 'https://api.weixin.qq.com/sns/userinfo'

    REDIRECT_STATE = False
    STATE_PARAMETER = False

    def get_user_details(self, response):
        """从微信响应中获取用户信息"""
        return {
            'username': response.get('nickname', ''),
            'first_name': response.get('nickname', ''),
            'avatar': response.get('headimgurl', ''),
            'wechat_openid': response.get('openid', ''),
            'wechat_unionid': response.get('unionid', ''),
        }

    def user_data(self, access_token, *args, **kwargs):
        """获取微信用户数据"""
        params = {
            'access_token': access_token,
            'openid': kwargs.get('response', {}).get('openid', ''),
            'lang': 'zh_CN'
        }

        # 判断是PC扫码还是移动端H5
        if self.strategy.request_get('platform', 'pc') == 'mobile':
            url = self.MOBILE_OPENID_URL
        else:
            url = self.OPENID_URL

        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()

            if 'errcode' in data:
                raise Exception(f"微信API错误: {data.get('errmsg', '未知错误')}")

            return data
        except Exception as e:
            raise Exception(f"获取微信用户信息失败: {str(e)}")

    def get_auth_params(self, redirect_uri=None, state=None):
        """获取认证参数"""
        params = super().get_auth_params(redirect_uri, state)
        params['appid'] = self.setting('KEY')
        params['scope'] = self.setting('SCOPE', 'snsapi_userinfo')
        params['response_type'] = 'code'

        # PC扫码需要添加state和redirect_uri到fragment
        if self.strategy.request_get('platform', 'pc') == 'pc':
            params['state'] = state or ''
            params['redirect_uri'] = redirect_uri or ''

        return params

    def auth_url(self):
        """生成授权URL"""
        platform = self.strategy.request_get('platform', 'pc')

        if platform == 'mobile':
            # 移动端H5授权
            params = {
                'appid': self.setting('KEY'),
                'redirect_uri': self.redirect_uri,
                'response_type': 'code',
                'scope': self.setting('SCOPE', 'snsapi_userinfo'),
                'state': self.state_token(),
            }
            return f"{self.MOBILE_AUTHORIZATION_URL}?{urlencode(params)}#wechat_redirect"
        else:
            # PC扫码授权
            params = {
                'appid': self.setting('KEY'),
                'redirect_uri': self.redirect_uri,
                'response_type': 'code',
                'scope': self.setting('SCOPE', 'snsapi_userinfo'),
                'state': self.state_token(),
            }
            return f"{self.AUTHORIZATION_URL}?{urlencode(params)}"

    def do_auth(self, access_token, response=None, *args, **kwargs):
        """执行认证"""
        response = response or {}
        kwargs.update({'response': response, 'backend': self})
        kwargs.update(self.strategy.extra_data())

        # 获取用户信息
        user_data = self.user_data(access_token, response=response, **kwargs)

        if not user_data:
            raise Exception('无法获取微信用户信息')

        # 获取或创建用户
        openid = user_data.get('openid')
        unionid = user_data.get('unionid', '')

        # 先查找是否已绑定
        social_auth = SocialAuth.objects.filter(
            provider='weixin',
            openid=openid
        ).first()

        if social_auth:
            # 已绑定，直接返回用户
            user = social_auth.user
        else:
            # 尝试通过unionid查找（同一开放平台下的应用）
            if unionid:
                social_auth_by_unionid = SocialAuth.objects.filter(
                    provider='weixin',
                    unionid=unionid
                ).first()

                if social_auth_by_unionid:
                    # 更新openid绑定
                    social_auth_by_unionid.openid = openid
                    social_auth_by_unionid.save()
                    user = social_auth_by_unionid.user
                else:
                    # 创建新用户
                    user = self.create_user_from_weixin(user_data)
            else:
                # 创建新用户
                user = self.create_user_from_weixin(user_data)

        # 更新额外数据
        social_auth, created = SocialAuth.objects.update_or_create(
            provider='weixin',
            openid=openid,
            defaults={
                'user': user,
                'unionid': unionid,
                'extra_data': user_data
            }
        )

        # 更新用户模型的字段
        user.wechat_openid = openid
        if unionid:
            user.wechat_unionid = unionid
        if not user.avatar and user_data.get('headimgurl'):
            user.avatar = user_data.get('headimgurl')
        user.save(update_fields=['wechat_openid', 'wechat_unionid', 'avatar'])

        kwargs['user'] = user
        kwargs['is_new'] = created
        return self.pipeline(**kwargs)

    def create_user_from_weixin(self, user_data):
        """从微信数据创建用户"""
        openid = user_data.get('openid')
        nickname = user_data.get('nickname', f'微信用户_{openid[:8]}')
        avatar = user_data.get('headimgurl', '')

        # 生成唯一用户名
        username = f"wx_{openid}"

        # 检查用户名是否存在
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


class AlipayOAuth2(BaseOAuth2):
    """支付宝OAuth2认证后端"""
    name = 'alipay'
    AUTHORIZATION_URL = 'https://openauth.alipay.com/oauth2/publicAppAuthorize.htm'
    ACCESS_TOKEN_URL = 'https://openapi.alipay.com/gateway.do'
    USER_INFO_URL = 'https://openapi.alipay.com/gateway.do'

    REDIRECT_STATE = False
    STATE_PARAMETER = True

    def get_user_details(self, response):
        """从支付宝响应中获取用户信息"""
        user_info = response.get('alipay_system_oauth_token_response', {})
        return {
            'username': user_info.get('user_id', ''),
            'alipay_user_id': user_info.get('user_id', ''),
        }

    def user_data(self, access_token, *args, **kwargs):
        """获取支付宝用户数据"""

        # 构建请求参数
        params = {
            'app_id': self.setting('KEY'),
            'method': 'alipay.user.info.share',
            'charset': 'utf-8',
            'sign_type': 'RSA2',
            'timestamp': self._get_timestamp(),
            'version': '1.0',
            'auth_token': access_token,
        }

        # 生成签名
        sign = self._generate_sign(params)
        params['sign'] = sign

        try:
            response = requests.post(
                self.USER_INFO_URL,
                data=params,
                timeout=10
            )
            response.raise_for_status()
            data = response.json()

            if 'error_response' in data:
                raise Exception(f"支付宝API错误: {data['error_response'].get('sub_msg', '未知错误')}")

            return data
        except Exception as e:
            raise Exception(f"获取支付宝用户信息失败: {str(e)}")

    def _get_timestamp(self):
        """获取当前时间戳"""
        from datetime import datetime
        return datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    def _generate_sign(self, params):
        """生成RSA2签名"""
        import base64
        from Crypto.PublicKey import RSA
        from Crypto.Signature import pkcs1_15
        from Crypto.Hash import SHA256

        # 排序并拼接参数
        sorted_params = sorted(params.items())
        sign_string = '&'.join([f"{k}={v}" for k, v in sorted_params if v])

        # 读取私钥
        private_key_str = self.setting('SECRET')
        if not private_key_str:
            raise Exception("未配置支付宝私钥")

        # 处理私钥格式
        if '-----BEGIN RSA PRIVATE KEY-----' not in private_key_str:
            private_key_str = '-----BEGIN RSA PRIVATE KEY-----\n' + private_key_str + '\n-----END RSA PRIVATE KEY-----'

        private_key = RSA.import_key(private_key_str.encode())

        # 生成签名
        h = SHA256.new(sign_string.encode('utf-8'))
        signature = pkcs1_15.new(private_key).sign(h)

        return base64.b64encode(signature).decode('utf-8')

    def do_auth(self, access_token, response=None, *args, **kwargs):
        """执行认证"""
        response = response or {}
        kwargs.update({'response': response, 'backend': self})
        kwargs.update(self.strategy.extra_data())

        # 从响应中获取user_id
        token_response = response.get('alipay_system_oauth_token_response', {})
        user_id = token_response.get('user_id')

        if not user_id:
            raise Exception('无法获取支付宝用户ID')

        # 查找是否已绑定
        social_auth = SocialAuth.objects.filter(
            provider='alipay',
            openid=user_id
        ).first()

        if social_auth:
            user = social_auth.user
            is_new = False
        else:
            # 创建新用户
            user = self.create_user_from_alipay(user_id)
            is_new = True

        # 创建或更新绑定关系
        social_auth, created = SocialAuth.objects.update_or_create(
            provider='alipay',
            openid=user_id,
            defaults={
                'user': user,
                'extra_data': response
            }
        )

        # 更新用户模型
        user.alipay_user_id = user_id
        user.save(update_fields=['alipay_user_id'])

        kwargs['user'] = user
        kwargs['is_new'] = is_new
        return self.pipeline(**kwargs)

    def create_user_from_alipay(self, user_id):
        """从支付宝数据创建用户"""
        username = f"alipay_{user_id}"

        # 检查用户名是否存在
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

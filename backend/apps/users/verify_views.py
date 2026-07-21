"""验证码登录 API 视图"""
import logging

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .captcha_services import get_captcha_config, verify_captcha_token
from .serializers import UserSerializer
from .verify_serializers import SendCodeSerializer, LoginByCodeSerializer
from .verify_services import create_and_send_code, get_login_mode

logger = logging.getLogger(__name__)


def _verify_captcha_or_reject(request) -> bool:
    """强制人机验证：如果已配置人机验证，则必须校验通过（不接受客户端跳过）"""
    captcha_config = get_captcha_config()
    if captcha_config.get('active'):
        provider = captcha_config['provider']
        captcha_data = {
            k: v for k, v in request.data.items()
            if k.startswith('captcha_') or k in ('lot_number', 'captcha_output', 'pass_token', 'gen_time',
                                                 'ticket', 'randstr', 'session_id', 'sig', 'token', 'scene',
                                                 'validate')
        }
        if not verify_captcha_token(provider, captcha_data):
            return False
    return True


class CaptchaConfigView(APIView):
    """获取人机验证配置"""
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response(get_captcha_config())


class SendCodeView(APIView):
    """发送验证码（需要先通过人机验证）"""
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        # 强制人机验证（如果配置了的话），不接受客户端跳过
        if not _verify_captcha_or_reject(request):
            return Response({'error': '人机验证失败，请重新验证'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = SendCodeSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        phone = serializer.validated_data.get('phone', '')
        email = serializer.validated_data.get('email', '')
        purpose = serializer.validated_data.get('purpose', 'login')

        try:
            create_and_send_code(phone=phone, email=email, purpose=purpose)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        return Response({'message': '验证码已发送'}, status=status.HTTP_200_OK)


class LoginByCodeView(APIView):
    """验证码登录"""
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        # 强制人机验证（如果配置了的话），不接受客户端跳过
        if not _verify_captcha_or_reject(request):
            return Response({'error': '人机验证失败，请重新验证'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = LoginByCodeSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.validated_data['user']
        refresh = RefreshToken.for_user(user)

        return Response({
            'user': UserSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'message': '登录成功',
        }, status=status.HTTP_200_OK)


class LoginModeView(APIView):
    """获取当前验证码登录模式配置"""
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request):
        mode = get_login_mode()
        return Response(mode)

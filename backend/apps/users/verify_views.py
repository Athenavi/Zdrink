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
        # 验证人机验证 token
        captcha_provider = request.data.get('captcha_provider', '')
        captcha_data = {
            k: v for k, v in request.data.items()
            if k.startswith('captcha_') or k in ('lot_number', 'captcha_output', 'pass_token', 'gen_time',
                                                 'ticket', 'randstr', 'session_id', 'sig', 'token', 'scene',
                                                 'validate')
        }
        if captcha_provider:
            if not verify_captcha_token(captcha_provider, captcha_data):
                return Response({'error': '人机验证失败，请重新验证'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = SendCodeSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        phone = serializer.validated_data.get('phone', '')
        email = serializer.validated_data.get('email', '')
        purpose = serializer.validated_data.get('purpose', 'login')

        create_and_send_code(phone=phone, email=email, purpose=purpose)

        return Response({'message': '验证码已发送'}, status=status.HTTP_200_OK)


class LoginByCodeView(APIView):
    """验证码登录"""
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        # 验证人机验证 token
        captcha_provider = request.data.get('captcha_provider', '')
        captcha_data = {
            k: v for k, v in request.data.items()
            if k.startswith('captcha_') or k in ('lot_number', 'captcha_output', 'pass_token', 'gen_time',
                                                 'ticket', 'randstr', 'session_id', 'sig', 'token', 'scene',
                                                 'validate')
        }
        if captcha_provider:
            if not verify_captcha_token(captcha_provider, captcha_data):
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

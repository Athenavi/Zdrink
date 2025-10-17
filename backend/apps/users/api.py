from datetime import timezone

from django.contrib.auth import login, logout
from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import (
    UserRegistrationSerializer,
    UserLoginSerializer,
    UserSerializer,
    UserProfileUpdateSerializer,
    ChangePasswordSerializer
)
from ..core.permissions import IsShopOwnerOrStaff


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response({
                'user': UserSerializer(user).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'message': '用户注册成功'
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            login(request, user)
            refresh = RefreshToken.for_user(user)
            return Response({
                'user': UserSerializer(user).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'message': '登录成功'
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    def post(self, request):
        logout(request)
        return Response({'message': '退出登录成功'}, status=status.HTTP_200_OK)


class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class UpdateProfileView(generics.UpdateAPIView):
    serializer_class = UserProfileUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            if not user.check_password(serializer.validated_data['old_password']):
                return Response(
                    {"old_password": ["原密码错误"]},
                    status=status.HTTP_400_BAD_REQUEST
                )

            user.set_password(serializer.validated_data['new_password'])
            user.save()
            return Response({"message": "密码修改成功"}, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_current_user(request):
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


from .models import MembershipLevelConfig, PointsLog, PointsRule, MemberRecharge
from .serializers import (
    MembershipLevelConfigSerializer, PointsLogSerializer, PointsRuleSerializer,
    MemberRechargeSerializer, UserMembershipSerializer, RechargeRequestSerializer,
    PointsConsumeSerializer
)
from .services import PointsService, MembershipService


class MembershipLevelConfigViewSet(ModelViewSet):
    """会员等级配置管理"""
    serializer_class = MembershipLevelConfigSerializer
    permission_classes = [IsShopOwnerOrStaff]

    def get_queryset(self):
        return MembershipLevelConfig.objects.filter(shop=self.request.tenant)

    def perform_create(self, serializer):
        serializer.save(shop=self.request.tenant)


class PointsRuleViewSet(ModelViewSet):
    """积分规则管理"""
    serializer_class = PointsRuleSerializer
    permission_classes = [IsShopOwnerOrStaff]

    def get_queryset(self):
        return PointsRule.objects.filter(shop=self.request.tenant)

    def perform_create(self, serializer):
        serializer.save(shop=self.request.tenant)


class PointsLogView(generics.ListAPIView):
    """积分记录"""
    serializer_class = PointsLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PointsLog.objects.filter(
            user=self.request.user,
            shop=self.request.tenant
        ).order_by('-created_at')


class MemberRechargeViewSet(ModelViewSet):
    """会员充值管理"""
    serializer_class = MemberRechargeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return MemberRecharge.objects.filter(
            user=self.request.user,
            shop=self.request.tenant
        ).order_by('-created_at')

    @action(detail=False, methods=['post'])
    def recharge(self, request):
        """会员充值"""
        serializer = RechargeRequestSerializer(data=request.data)

        if serializer.is_valid():
            amount = serializer.validated_data['amount']
            payment_method = serializer.validated_data['payment_method']

            membership_service = MembershipService(request.user, request.tenant)
            recharge = membership_service.recharge(amount, payment_method)

            return Response(MemberRechargeSerializer(recharge).data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def user_membership_info(request):
    """获取用户会员信息"""
    serializer = UserMembershipSerializer(request.user)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def consume_points(request):
    """消费积分"""
    serializer = PointsConsumeSerializer(data=request.data)

    if serializer.is_valid():
        points = serializer.validated_data['points']
        order_id = serializer.validated_data.get('order_id')

        points_service = PointsService(request.user, request.tenant)

        try:
            points_service.consume_points(
                points=points,
                points_type='consume_order',
                reference_id=order_id or '',
                notes='积分消费'
            )

            return Response({
                'message': '积分消费成功',
                'current_points': request.user.available_points
            })

        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def signin_earn_points(request):
    """签到获得积分"""
    today = timezone.now().date()

    # 检查今天是否已经签到
    today_log = PointsLog.objects.filter(
        user=request.user,
        shop=request.tenant,
        points_type='earn_signin',
        created_at__date=today
    ).first()

    if today_log:
        return Response(
            {'error': '今天已经签到过了'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # 获取签到积分规则
    try:
        rule = PointsRule.objects.get(
            shop=request.tenant,
            rule_type='signin_earn',
            is_active=True
        )

        points = rule.config.get('points', 10)  # 默认10积分

        points_service = PointsService(request.user, request.tenant)
        points_service.earn_points(
            points=points,
            points_type='earn_signin',
            notes='每日签到'
        )

        return Response({
            'message': '签到成功',
            'points_earned': points,
            'current_points': request.user.available_points
        })

    except PointsRule.DoesNotExist:
        return Response(
            {'error': '签到规则未配置'},
            status=status.HTTP_400_BAD_REQUEST
        )
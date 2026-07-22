"""商家入驻申请 API 视图"""
import uuid

from django.contrib.auth.hashers import check_password
from django.db import transaction
from django.utils import timezone
from django_tenants.utils import schema_context, get_public_schema_name
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .apply_serializers import (
    ShopApplySerializer,
    ShopApplyListSerializer,
    ShopApplyDetailSerializer,
    ShopApplySetupSerializer,
)
from .models import ShopApply


class ShopApplyView(APIView):
    """入驻申请：提交（无需登录）/ 查询（通过手机号/邮箱，无需登录）"""

    def get_permissions(self):
        return [permissions.AllowAny()]

    authentication_classes = []  # 禁用默认认证，仅通过手机号/邮箱验证身份

    def post(self, request):
        """提交入驻申请"""
        serializer = ShopApplySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        serializer.save()
        return Response({'message': '入驻申请已提交，请等待审核'}, status=status.HTTP_201_CREATED)

    def get(self, request):
        """查询入驻申请记录（通过手机号/邮箱，无需登录）"""
        phone = request.query_params.get('phone', '')
        email = request.query_params.get('email', '')

        if not phone and not email:
            return Response(
                {'error': '请提供 phone 或 email 参数查询申请记录'},
                status=status.HTTP_400_BAD_REQUEST
            )

        qs = ShopApply.objects.all()
        if phone:
            qs = qs.filter(contact_phone=phone)
        if email:
            qs = qs.filter(contact_email=email)

        serializer = ShopApplyListSerializer(qs, many=True)
        return Response(serializer.data)


class ShopApplySetupView(APIView):
    """入驻配置：通过一次性令牌验证密码并设置店铺基本配置"""
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request, token):
        """验证令牌有效性，返回申请信息（不含密码）"""
        try:
            token_uuid = uuid.UUID(str(token))
        except (ValueError, TypeError):
            return Response({'error': '无效的令牌'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            apply = ShopApply.objects.get(setup_token=token_uuid, status='approved')
        except ShopApply.DoesNotExist:
            return Response({'error': '令牌无效或已过期'}, status=status.HTTP_404_NOT_FOUND)

        if apply.setup_completed:
            return Response({'error': '该链接已使用，请直接登录管理后台'}, status=status.HTTP_410_GONE)

        serializer = ShopApplyDetailSerializer(apply)
        return Response(serializer.data)

    def post(self, request, token):
        """验证密码并保存店铺基本配置"""
        try:
            token_uuid = uuid.UUID(str(token))
        except (ValueError, TypeError):
            return Response({'error': '无效的令牌'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            apply = ShopApply.objects.get(setup_token=token_uuid, status='approved')
        except ShopApply.DoesNotExist:
            return Response({'error': '令牌无效或已过期'}, status=status.HTTP_404_NOT_FOUND)

        if apply.setup_completed:
            return Response({'error': '该链接已使用，请直接登录管理后台'}, status=status.HTTP_410_GONE)

        # 验证密码
        password = request.data.get('password', '')
        if not password or not check_password(password, apply.account_password):
            return Response({'error': '密码错误'}, status=status.HTTP_403_FORBIDDEN)

        # 验证并保存店铺配置
        serializer = ShopApplySetupSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                # 切换到 public schema 查询共享模型
                with schema_context(get_public_schema_name()):
                    shop = apply.shop
                    if not shop:
                        return Response(
                            {'error': '未找到关联店铺，请联系管理员'},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR
                        )

                    # 更新店铺配置
                    setup_data = serializer.validated_data
                    update_fields = {}

                    # 字段映射（Shop 模型字段名与序列化器字段名的对应关系）
                    field_mapping = {
                        'shop_name': 'name',
                        'shop_description': 'description',
                        'shop_address': 'address',
                        'phone': 'phone',
                        'opening_hours': 'opening_hours',
                        'allow_delivery': 'allow_delivery',
                        'allow_pickup': 'allow_pickup',
                        'allow_dine_in': 'allow_dine_in',
                        'delivery_fee': 'delivery_fee',
                        'minimum_order_amount': 'minimum_order_amount',
                        'delivery_radius': 'delivery_radius',
                        'latitude': 'latitude',
                        'longitude': 'longitude',
                    }

                    for serializer_field, model_field in field_mapping.items():
                        if serializer_field in setup_data and setup_data[serializer_field] is not None:
                            update_fields[model_field] = setup_data[serializer_field]

                    if update_fields:
                        for key, value in update_fields.items():
                            setattr(shop, key, value)
                        shop.save(update_fields=update_fields.keys())

                # 标记设置完成（ShopApply 也是共享模型，在 public schema 中）
                apply.setup_completed = True
                apply.setup_completed_at = timezone.now()
                apply.save(update_fields=['setup_completed', 'setup_completed_at'])

                return Response({
                    'message': '店铺配置完成，请前往登录',
                    'shop_id': shop.id,
                    'shop_name': shop.name,
                })

        except Exception as e:
            return Response(
                {'error': f'保存配置失败: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

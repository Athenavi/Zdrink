from django.db import transaction
from django_tenants.utils import schema_context, get_public_schema_name
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .models import Shop, ShopStaff, ShopSettings
from .serializers import (
    ShopSerializer,
    ShopCreateSerializer,
    ShopStaffSerializer,
    ShopStaffCreateSerializer,
    ShopSettingsSerializer
)
from ..core.permissions import IsShopOwnerOrStaff


class ShopListView(generics.ListCreateAPIView):
    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated()]
        # GET 请求允许未认证用户访问
        return [permissions.AllowAny()]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ShopCreateSerializer
        return ShopSerializer

    def get_queryset(self):
        user = self.request.user

        with schema_context(get_public_schema_name()):
            # 如果用户未认证，只返回激活的店铺
            if not user.is_authenticated:
                return Shop.objects.filter(is_active=True)

            if user.user_type == 'super_admin':
                return Shop.objects.all()
            elif user.user_type in ['shop_owner', 'shop_staff']:
                # 返回用户关联的店铺
                return Shop.objects.filter(staff__user=user, staff__is_active=True)
            else:
                return Shop.objects.filter(is_active=True)

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        # 只有超级管理员可以创建店铺
        if request.user.user_type != 'super_admin':
            return Response(
                {"error": "只有超级管理员可以创建店铺"},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with schema_context(get_public_schema_name()):
            shop = serializer.save()

        return Response(
            ShopSerializer(shop).data,
            status=status.HTTP_201_CREATED
        )


class ShopDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Shop.objects.all()
    serializer_class = ShopSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        with schema_context(get_public_schema_name()):
            if user.user_type == 'super_admin':
                return Shop.objects.all()
            elif user.user_type in ['shop_owner', 'shop_staff']:
                return Shop.objects.filter(staff__user=user, staff__is_active=True)
            else:
                return Shop.objects.filter(is_active=True)


class ShopStaffListView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ShopStaffCreateSerializer
        return ShopStaffSerializer

    def get_queryset(self):
        shop_id = self.kwargs.get('shop_id')
        user = self.request.user

        with schema_context(get_public_schema_name()):
            # 检查用户是否有权限管理该店铺的员工
            if not self.has_shop_permission(user, shop_id):
                return ShopStaff.objects.none()

            return ShopStaff.objects.filter(shop_id=shop_id, is_active=True)

    def has_shop_permission(self, user, shop_id):
        if user.user_type == 'super_admin':
            return True

        try:
            with schema_context(get_public_schema_name()):
                staff = ShopStaff.objects.get(user=user, shop_id=shop_id, is_active=True)
            return staff.role in ['owner', 'manager']
        except ShopStaff.DoesNotExist:
            return False

    def create(self, request, *args, **kwargs):
        shop_id = self.kwargs.get('shop_id')

        if not self.has_shop_permission(request.user, shop_id):
            return Response(
                {"error": "没有权限管理该店铺的员工"},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # 设置店铺ID
        serializer.validated_data['shop_id'] = shop_id
        with schema_context(get_public_schema_name()):
            shop_staff = serializer.save()

        return Response(
            ShopStaffSerializer(shop_staff).data,
            status=status.HTTP_201_CREATED
        )


class ShopSettingsView(generics.RetrieveUpdateAPIView):
    serializer_class = ShopSettingsSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        shop_id = self.kwargs.get('shop_id') or self.request.tenant.id

        # 检查权限
        if not self.has_shop_permission(self.request.user, shop_id):
            raise permissions.PermissionDenied("没有权限修改店铺设置")

        with schema_context(get_public_schema_name()):
            return ShopSettings.objects.get(shop_id=shop_id)

    def has_shop_permission(self, user, shop_id):
        if user.user_type == 'super_admin':
            return True

        try:
            with schema_context(get_public_schema_name()):
                staff = ShopStaff.objects.get(user=user, shop_id=shop_id, is_active=True)
            return staff.role in ['owner', 'manager']
        except ShopStaff.DoesNotExist:
            return False


@api_view(['GET', 'PUT'])
@permission_classes([permissions.IsAuthenticated])
def get_current_shop(request):
    """获取或更新当前用户关联的店铺"""
    user = request.user

    if request.method == 'PUT':
        # 使用当前租户作为要更新的店铺
        shop = request.tenant
        if not shop:
            return Response({'error': '未找到当前店铺'}, status=status.HTTP_404_NOT_FOUND)

        # 验证权限
        if user.user_type != 'super_admin':
            try:
                with schema_context(get_public_schema_name()):
                    staff = ShopStaff.objects.get(
                        user=user, shop=shop, is_active=True
                    )
                if staff.role not in ('owner', 'manager'):
                    return Response(
                        {'error': '没有权限修改该店铺'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            except ShopStaff.DoesNotExist:
                return Response(
                    {'error': '没有权限修改该店铺'},
                    status=status.HTTP_403_FORBIDDEN
                )

        serializer = ShopSerializer(shop, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    # GET 逻辑
    with schema_context(get_public_schema_name()):
        if user.user_type == 'super_admin':
            shops = Shop.objects.all()
        else:
            shops = Shop.objects.filter(staff__user=user, staff__is_active=True)

    serializer = ShopSerializer(shops, many=True)
    return Response(serializer.data)


@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated, IsShopOwnerOrStaff])
def get_current_staff(request):
    """获取/添加当前店铺的员工"""
    shop = request.tenant
    if request.method == 'GET':
        with schema_context(get_public_schema_name()):
            staff = ShopStaff.objects.filter(shop=shop, is_active=True)
        serializer = ShopStaffSerializer(staff, many=True)
        return Response(serializer.data)

    serializer = ShopStaffCreateSerializer(data=request.data, context={'request': request})
    serializer.is_valid(raise_exception=True)
    with schema_context(get_public_schema_name()):
        serializer.save(shop=shop)
    return Response(serializer.data, status=201)

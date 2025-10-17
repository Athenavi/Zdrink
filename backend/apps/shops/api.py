from django.db import transaction
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


class ShopListView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ShopCreateSerializer
        return ShopSerializer

    def get_queryset(self):
        user = self.request.user

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

        # 检查用户是否有权限管理该店铺的员工
        if not self.has_shop_permission(user, shop_id):
            return ShopStaff.objects.none()

        return ShopStaff.objects.filter(shop_id=shop_id, is_active=True)

    def has_shop_permission(self, user, shop_id):
        if user.user_type == 'super_admin':
            return True

        try:
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
        shop_staff = serializer.save()

        return Response(
            ShopStaffSerializer(shop_staff).data,
            status=status.HTTP_201_CREATED
        )


class ShopSettingsView(generics.RetrieveUpdateAPIView):
    serializer_class = ShopSettingsSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        shop_id = self.kwargs.get('shop_id')

        # 检查权限
        if not self.has_shop_permission(self.request.user, shop_id):
            raise permissions.PermissionDenied("没有权限修改店铺设置")

        return ShopSettings.objects.get(shop_id=shop_id)

    def has_shop_permission(self, user, shop_id):
        if user.user_type == 'super_admin':
            return True

        try:
            staff = ShopStaff.objects.get(user=user, shop_id=shop_id, is_active=True)
            return staff.role in ['owner', 'manager']
        except ShopStaff.DoesNotExist:
            return False


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_current_shop(request):
    """获取当前用户关联的店铺"""
    user = request.user

    if user.user_type == 'super_admin':
        shops = Shop.objects.all()
    else:
        shops = Shop.objects.filter(staff__user=user, staff__is_active=True)

    serializer = ShopSerializer(shops, many=True)
    return Response(serializer.data)
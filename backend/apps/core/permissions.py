from apps.shops.models import ShopStaff
from rest_framework import permissions


class IsShopOwnerOrStaff(permissions.BasePermission):
    """
    检查用户是否是店铺所有者或员工
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        # 超级管理员拥有所有权限
        if request.user.user_type == 'super_admin':
            return True

        # 获取当前租户（店铺）
        tenant = getattr(request, 'tenant', None)
        if not tenant:
            return False

        # 检查用户是否是该店铺的员工
        try:
            staff = ShopStaff.objects.get(
                user=request.user,
                shop=tenant,
                is_active=True
            )
            return True
        except ShopStaff.DoesNotExist:
            return False


class IsShopOwner(permissions.BasePermission):
    """
    检查用户是否是店铺所有者
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        if request.user.user_type == 'super_admin':
            return True

        tenant = getattr(request, 'tenant', None)
        if not tenant:
            return False

        try:
            staff = ShopStaff.objects.get(
                user=request.user,
                shop=tenant,
                is_active=True,
                role='owner'
            )
            return True
        except ShopStaff.DoesNotExist:
            return False


class IsShopManager(permissions.BasePermission):
    """
    检查用户是否是店铺所有者或店长
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        if request.user.user_type == 'super_admin':
            return True

        tenant = getattr(request, 'tenant', None)
        if not tenant:
            return False

        try:
            staff = ShopStaff.objects.get(
                user=request.user,
                shop=tenant,
                is_active=True,
                role__in=['owner', 'manager']
            )
            return True
        except ShopStaff.DoesNotExist:
            return False


class HasShopPermission(permissions.BasePermission):
    """
    检查用户是否具有特定店铺权限
    """

    def __init__(self, permission):
        self.permission = permission

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        if request.user.user_type == 'super_admin':
            return True

        tenant = getattr(request, 'tenant', None)
        if not tenant:
            return False

        try:
            staff = ShopStaff.objects.get(
                user=request.user,
                shop=tenant,
                is_active=True
            )

            # 检查权限
            if staff.role == 'owner':
                return True
            elif staff.permissions.get(self.permission, False):
                return True
            elif staff.role == 'manager' and self.permission in ['product_manage', 'order_manage']:
                return True

            return False
        except ShopStaff.DoesNotExist:
            return False


def shop_permission_required(permission):
    """
    权限装饰器
    """

    def decorator(func):
        def wrapper(request, *args, **kwargs):
            perm = HasShopPermission(permission)
            if not perm.has_permission(request, None):
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("没有操作权限")
            return func(request, *args, **kwargs)

        return wrapper

    return decorator
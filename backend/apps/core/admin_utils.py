"""
Admin 权限管理工具
为租户管理员提供后台访问权限
"""
from apps.shops.models import ShopStaff


def get_user_tenant(user):
    """
    获取用户关联的店铺（租户）
    优先从 request 中获取，如果没有则获取用户第一个关联的店铺
    """
    # 如果用户是超级管理员，不需要租户上下文
    if user.is_superuser:
        return None

    # 获取用户作为员工的第一个店铺
    staff_membership = ShopStaff.objects.filter(
        user=user,
        is_active=True
    ).select_related('shop').first()

    if staff_membership:
        return staff_membership.shop

    return None


class TenantAdminMixin:
    """
    租户 Admin 混入类
    为租户管理员提供查看和编辑权限
    """

    def has_view_permission(self, request, obj=None):
        """控制查看权限"""
        if request.user.is_superuser:
            return True

        # 对于非 superuser，检查是否是租户员工（owner 或 manager）
        tenant = getattr(request, 'tenant', None)
        if not tenant:
            # 尝试从用户关联中获取租户
            tenant = get_user_tenant(request.user)

        if tenant:
            return ShopStaff.objects.filter(
                user=request.user,
                shop=tenant,
                is_active=True,
                role__in=['owner', 'manager']
            ).exists()

        return False

    def has_change_permission(self, request, obj=None):
        """控制编辑权限"""
        if request.user.is_superuser:
            return True

        # 对于非 superuser，检查是否是租户员工（owner 或 manager）
        tenant = getattr(request, 'tenant', None)
        if not tenant:
            tenant = get_user_tenant(request.user)

        if tenant:
            return ShopStaff.objects.filter(
                user=request.user,
                shop=tenant,
                is_active=True,
                role__in=['owner', 'manager']
            ).exists()

        return False

    def has_delete_permission(self, request, obj=None):
        """控制删除权限 - 只有超级管理员可以删除"""
        return request.user.is_superuser

    def has_add_permission(self, request):
        """控制添加权限 - 租户管理员可以添加"""
        if request.user.is_superuser:
            return True

        tenant = getattr(request, 'tenant', None)
        if not tenant:
            tenant = get_user_tenant(request.user)

        if tenant:
            return ShopStaff.objects.filter(
                user=request.user,
                shop=tenant,
                is_active=True,
                role__in=['owner', 'manager']
            ).exists()

        return False


def get_user_shop_role(user, tenant):
    """
    获取用户在指定店铺中的角色
    """
    try:
        staff = ShopStaff.objects.get(
            user=user,
            shop=tenant,
            is_active=True
        )
        return staff.role
    except ShopStaff.DoesNotExist:
        return None


def is_shop_owner_or_manager(user, tenant):
    """
    检查用户是否是店铺的店主或店长
    """
    role = get_user_shop_role(user, tenant)
    return role in ['owner', 'manager'] if role else False

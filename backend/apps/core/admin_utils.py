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

    def get_queryset(self, request):
        """根据用户角色过滤查询集"""
        qs = super().get_queryset(request)

        # 超级管理员可以看到所有数据
        if request.user.is_superuser:
            return qs

        # 获取用户的租户
        tenant = getattr(request, 'tenant', None)
        if not tenant:
            tenant = get_user_tenant(request.user)

        # 如果模型有 shop 或 tenant 字段，进行过滤
        if tenant and hasattr(qs.model, 'shop'):
            return qs.filter(shop=tenant)
        elif tenant and hasattr(qs.model, 'tenant'):
            return qs.filter(tenant=tenant)

        return qs

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

        # 如果没有租户上下文，但用户是 shop_owner 或 shop_staff 类型
        # 允许他们访问 admin（会在具体对象级别进行过滤）
        if request.user.user_type in ['shop_owner', 'shop_staff']:
            return True

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

        # 如果没有租户上下文，但用户是 shop_owner 或 shop_staff 类型
        # 允许他们编辑（会在具体对象级别进行过滤）
        if request.user.user_type in ['shop_owner', 'shop_staff']:
            return True

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

        # 如果没有租户上下文，但用户是 shop_owner 或 shop_staff 类型
        # 允许他们添加（会在保存时进行租户关联）
        if request.user.user_type in ['shop_owner', 'shop_staff']:
            return True

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

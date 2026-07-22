"""
自定义中间件
"""
from django.conf import settings
from django.db import connection


class DisableCSRFMiddleware:
    """
    对 /api/ 开头的请求禁用 CSRF 验证
    因为 API 使用 JWT 认证（Authorization: Bearer <token>），
    浏览器不会自动附加 Bearer token，CSRF 攻击无法利用 cookie 中的 token，
    因此 CSRF 保护是不必要的。
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # 对 /api/ 开头的请求禁用 CSRF 验证（路径精确匹配，避免中间件顺序问题）
        path = request.path_info or request.path
        if path.startswith('/api/'):
            setattr(request, '_dont_enforce_csrf_checks', True)
            setattr(request, 'csrf_processing_done', True)

        response = self.get_response(request)
        return response


class TenantFromHeaderOrFallbackMiddleware:
    """
    租户识别中间件（在 TenantMainMiddleware 之后执行）：
    1. 优先从 X-Tenant header 识别租户（前端登录后选择的店铺 ID）
    2. 其次在 DEBUG 模式下 localhost 访问时使用第一个可用租户
    3. 否则保留 TenantMainMiddleware 的结果不变
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # 步骤 1：尝试从 X-Tenant header 识别租户
        tenant_id = request.headers.get('X-Tenant') or request.META.get('HTTP_X_TENANT', '')
        if tenant_id:
            try:
                from django_tenants.utils import schema_context, get_public_schema_name
                with schema_context(get_public_schema_name()):
                    from apps.shops.models import Shop
                    shop = Shop.objects.get(id=tenant_id)
                    request.tenant = shop
                    connection.set_tenant(request.tenant)
                    response = self.get_response(request)
                    return response
            except (Shop.DoesNotExist, ValueError, TypeError):
                pass  # X-Tenant 无效，继续其他方式

        # 步骤 2：开发环境 localhost 回退
        if settings.DEBUG:
            host = request.get_host().split(':')[0]
            if host in ('localhost', '127.0.0.1', '::1'):
                if not hasattr(request, 'tenant') or request.tenant is None:
                    from django_tenants.utils import get_tenant_model
                    tenant = get_tenant_model().objects.first()
                    if tenant:
                        request.tenant = tenant
                        connection.set_tenant(request.tenant)

        response = self.get_response(request)
        return response

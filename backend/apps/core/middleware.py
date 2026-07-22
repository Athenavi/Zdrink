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


class DevTenantFallbackMiddleware:
    """
    开发环境中间件：当通过 localhost 访问时，自动使用第一个可用的 tenant。
    避免开发时需要修改 hosts 文件或使用 tenant domain 访问 Admin。
    仅在 DEBUG=True 时生效。
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if settings.DEBUG:
            host = request.get_host().split(':')[0]
            if host in ('localhost', '127.0.0.1'):
                if not hasattr(request, 'tenant') or request.tenant is None:
                    from django_tenants.utils import get_tenant_model
                    tenant = get_tenant_model().objects.first()
                    if tenant:
                        request.tenant = tenant
                        connection.set_tenant(request.tenant)

        response = self.get_response(request)
        return response

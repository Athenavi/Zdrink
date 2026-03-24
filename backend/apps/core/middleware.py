"""
自定义中间件：对 API 请求禁用 CSRF 验证
"""


class DisableCSRFMiddleware:
    """
    对 /api/ 开头的请求禁用 CSRF 验证
    因为 API 使用 JWT 认证，不需要 CSRF 保护
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # 对 API 请求禁用 CSRF
        if request.path.startswith('/api/'):
            setattr(request, '_dont_enforce_csrf_checks', True)

        response = self.get_response(request)
        return response

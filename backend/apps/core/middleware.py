"""
自定义中间件：对 API 请求禁用 CSRF 验证
"""


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

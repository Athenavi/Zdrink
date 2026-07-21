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
        # 仅对支付回调端点禁用 CSRF（这些端点由第三方支付平台直接调用，不支持 CSRF token）
        CSRF_EXEMPT_PATHS = ['/api/payments/callback/', '/api/orders/callback/']
        if any(request.path.startswith(path) for path in CSRF_EXEMPT_PATHS):
            setattr(request, '_dont_enforce_csrf_checks', True)

        response = self.get_response(request)
        return response

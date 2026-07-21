import {NextRequest, NextResponse} from 'next/server';

export async function middleware(req: NextRequest) {
    const host = req.headers.get('host') || '';
    const {pathname} = req.nextUrl;

    // 1. 多租户处理
    const subdomain = host.split('.')[0];
    const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
    const tenant = isLocalhost
        ? process.env.NEXT_PUBLIC_DEFAULT_TENANT || 'default'
        : subdomain;

    // 2. 认证检查 - 仅检查 cookie 中是否有 token（不解析 JWT payload，因为无法在前端验证签名）
    const token = req.cookies.get('token')?.value;
    const isAuthenticated = !!token;

    const isAuthPage = pathname.startsWith('/(auth)') || pathname === '/login';
    const isPublicRoute = ['/home', '/products', '/about', '/'].some(p => pathname === p || pathname.startsWith(p + '/'));

    // 3. 设置请求头
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-tenant', tenant || '');

    // 4. 响应初始化
    let response = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });

    // 5. 设置租户 cookie
    response.cookies.set('x-tenant', tenant || '', {
        path: '/',
        sameSite: 'lax',
    });

    // 6. 路由守卫逻辑

    // 6.1 需要认证的页面 - 未登录则重定向到登录页
    const protectedRoutes = [
        '/profile',
        '/cart',
        '/order',
        '/address',
        '/help',
        '/pos',
        '/printing'
    ];

    const isProtectedRoute = protectedRoutes.some(p => pathname.startsWith(p));

    if (isProtectedRoute && !isAuthenticated) {
        const loginUrl = new URL('/login', req.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // 6.2 已登录用户访问认证页面 - 重定向到首页
    if (isAuthPage && isAuthenticated) {
        return NextResponse.redirect(new URL('/home', req.url));
    }

    // 7. 记录访问日志（仅在开发环境且是重要路由时）
    if (process.env.NODE_ENV === 'development') {
        const importantRoutes = ['/home', '/login', '/profile', '/pos', '/printing', '/cart'];
        if (importantRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))) {
            console.log(`[Middleware] ${pathname} | Tenant: ${tenant} | Authenticated: ${isAuthenticated}`);
        }
    }

    return response;
}

// 配置 Middleware 匹配的路径
export const config = {
    matcher: [
        /*
         * 匹配所有路径，除了：
         * - _next/static (静态文件)
         * - _next/image (图片优化文件)
         * - favicon.ico (网站图标)
         * - 公共文件 (svg, png, jpg 等)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};

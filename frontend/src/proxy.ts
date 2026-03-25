import {NextRequest, NextResponse} from 'next/server';
import {getToken} from 'next-auth/jwt';

export async function proxy(req: NextRequest) {
    const host = req.headers.get('host') || '';
    const {pathname} = req.nextUrl;

    // 1. 多租户处理
    const subdomain = host.split('.')[0];
    const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
    const tenant = isLocalhost
        ? process.env.NEXT_PUBLIC_DEFAULT_TENANT || 'default'
        : subdomain;

    // 2. 认证检查
    const token = await getToken({req, secret: process.env.NEXTAUTH_SECRET});
    const isAuthenticated = !!token;
    const isAuthPage = pathname.startsWith('/auth');
    const isPublicRoute = ['/home', '/products', '/about'].some(p => pathname.startsWith(p));

    // 3. 设置请求头
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-tenant', tenant || '');
    requestHeaders.set('x-user-id', token?.sub || '');

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
        const loginUrl = new URL('/auth/login', req.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // 6.2 已登录用户访问认证页面 - 重定向到首页
    if (isAuthPage && isAuthenticated) {
        return NextResponse.redirect(new URL('/home', req.url));
    }

    // 7. 角色权限检查（可选）
    if (isProtectedRoute && isAuthenticated) {
        const userRole = token?.role as string;

        // POS 和打印管理仅限管理员或收银员
        const adminRoutes = ['/pos', '/printing'];
        const isAdminRoute = adminRoutes.some(p => pathname.startsWith(p));

        if (isAdminRoute && userRole !== 'admin' && userRole !== 'cashier') {
            // 无权访问，重定向到首页或错误页
            return NextResponse.redirect(new URL('/home', req.url));
        }
    }

    // 8. Token 刷新逻辑（如果 token 快过期）
    if (token && token.exp) {
        const now = Date.now() / 1000;
        const expiresIn = Number(token.exp) - now;

        // 如果剩余时间少于 1 小时，刷新 token
        if (expiresIn < 3600) {
            // 这里可以调用 API 刷新 token
            // 具体实现取决于后端 API
        }
    }

    // 9. 记录访问日志（可选）
    if (process.env.NODE_ENV === 'development') {
        console.log(`[Middleware] ${pathname} | Tenant: ${tenant} | User: ${token?.sub || 'Anonymous'}`);
    }

    return response;
}

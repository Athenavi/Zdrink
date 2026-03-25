'use client';

import {useEffect, useState} from 'react';
import {usePathname, useRouter} from 'next/navigation';
import {useSession} from 'next-auth/react';
import Loading from '../Loading';

interface AuthGuardProps {
    children: React.ReactNode;
    requiredRole?: string[];
    fallback?: React.ReactNode;
}

/**
 * 客户端认证守卫组件
 * 用于保护需要登录才能访问的页面
 */
export function AuthGuard({
                              children,
                              requiredRole = [],
                              fallback = <Loading/>
                          }: AuthGuardProps) {
    const {data: session, status} = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        // 加载中，显示 fallback
        if (status === 'loading') {
            return;
        }

        // 未登录，重定向到登录页
        if (status === 'unauthenticated') {
            router.replace(`/auth/login?callbackUrl=${encodeURIComponent(pathname)}`);
            return;
        }

        // 已登录，检查角色权限
        if (status === 'authenticated' && requiredRole.length > 0) {
            const userRole = session?.user?.role;

            if (!userRole || !requiredRole.includes(userRole)) {
                // 无权访问，重定向到首页或错误页
                router.replace('/home');
                return;
            }
        }

        // 验证通过
        setIsAuthorized(true);
    }, [status, session, router, pathname, requiredRole]);

    // 加载或未授权时显示 fallback
    if (status === 'loading' || !isAuthorized) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}

/**
 * 已登录用户专用守卫
 * 已登录用户访问此组件包裹的内容会被重定向到首页
 */
interface GuestGuardProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export function GuestGuard({
                               children,
                               fallback = <Loading/>
                           }: GuestGuardProps) {
    const {data: session, status} = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === 'authenticated') {
            // 已登录，重定向到首页
            router.replace('/home');
        }
    }, [status, router]);

    // 已登录时显示 fallback
    if (status === 'authenticated') {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}

/**
 * 角色守卫组件
 * 仅允许指定角色的用户访问
 */
interface RoleGuardProps {
    children: React.ReactNode;
    allowedRoles: string[];
    fallback?: React.ReactNode;
    redirectTo?: string;
}

export function RoleGuard({
                              children,
                              allowedRoles,
                              fallback = <Loading/>,
                              redirectTo = '/home'
                          }: RoleGuardProps) {
    const {data: session, status} = useSession();
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        if (status === 'loading') {
            return;
        }

        if (status === 'unauthenticated') {
            router.replace(`/auth/login`);
            return;
        }

        if (status === 'authenticated') {
            const userRole = session?.user?.role;

            if (!userRole || !allowedRoles.includes(userRole)) {
                // 无权访问，重定向
                router.replace(redirectTo);
                return;
            }

            setIsAuthorized(true);
        }
    }, [status, session, router, allowedRoles, redirectTo]);

    if (status === 'loading' || !isAuthorized) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}

/**
 * POS 收银员专用守卫
 */
interface PosGuardProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export function PosGuard({children, fallback = <Loading/>}: PosGuardProps) {
    return (
        <RoleGuard
            allowedRoles={['admin', 'cashier']}
            fallback={fallback}
        >
            {children}
        </RoleGuard>
    );
}

/**
 * 管理员专用守卫
 */
interface AdminGuardProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export function AdminGuard({children, fallback = <Loading/>}: AdminGuardProps) {
    return (
        <RoleGuard
            allowedRoles={['admin']}
            fallback={fallback}
        >
            {children}
        </RoleGuard>
    );
}

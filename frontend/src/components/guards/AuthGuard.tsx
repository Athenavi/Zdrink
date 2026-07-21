'use client';

import {useEffect, useRef} from 'react';
import {usePathname, useRouter} from 'next/navigation';
import {useUserStore} from '@/stores/user';
import Loading from '../Loading';

interface AuthGuardProps {
    children: React.ReactNode;
    requiredRole?: string[];
    fallback?: React.ReactNode;
}

/**
 * 客户端认证守卫组件
 * 使用 useUserStore（自定义 JWT 认证），而非 next-auth
 */
export function AuthGuard({
                              children,
                              requiredRole = [],
                              fallback = <Loading/>
                          }: AuthGuardProps) {
    const {isLoggedIn, userInfo} = useUserStore();
    const router = useRouter();
    const pathname = usePathname();
    const redirectedRef = useRef(false);

    useEffect(() => {
        if (redirectedRef.current) return;

        if (!isLoggedIn) {
            redirectedRef.current = true;
            router.replace(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
        } else if (requiredRole.length > 0 && userInfo) {
            const userRole = userInfo.user_type;
            if (!userRole || !requiredRole.includes(userRole)) {
                redirectedRef.current = true;
                router.replace('/home');
            }
        }
    }, [isLoggedIn, userInfo, router, pathname, requiredRole]);

    if (typeof isLoggedIn === 'undefined') {
        return <>{fallback}</>;
    }

    if (!isLoggedIn) {
        return <>{fallback}</>;
    }

    if (requiredRole.length > 0 && userInfo) {
        const userRole = userInfo.user_type;
        if (!userRole || !requiredRole.includes(userRole)) {
            return <>{fallback}</>;
        }
    }

    return <>{children}</>;
}

/**
 * 已登录用户专用守卫
 */
interface GuestGuardProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export function GuestGuard({
                               children,
                               fallback = <Loading/>
                           }: GuestGuardProps) {
    const {isLoggedIn} = useUserStore();
    const router = useRouter();
    const redirectedRef = useRef(false);

    useEffect(() => {
        if (isLoggedIn && !redirectedRef.current) {
            redirectedRef.current = true;
            router.replace('/home');
        }
    }, [isLoggedIn, router]);

    if (isLoggedIn) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}

/**
 * 角色守卫组件
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
    const {isLoggedIn, userInfo} = useUserStore();
    const router = useRouter();
    const redirectedRef = useRef(false);

    useEffect(() => {
        if (redirectedRef.current) return;

        if (!isLoggedIn) {
            redirectedRef.current = true;
            router.replace('/login');
            return;
        }

        if (userInfo) {
            const userRole = userInfo.user_type;
            if (!userRole || !allowedRoles.includes(userRole)) {
                redirectedRef.current = true;
                router.replace(redirectTo);
            }
        }
    }, [isLoggedIn, userInfo, router, allowedRoles, redirectTo]);

    if (typeof isLoggedIn === 'undefined') {
        return <>{fallback}</>;
    }

    if (!isLoggedIn) {
        return <>{fallback}</>;
    }

    if (userInfo) {
        const userRole = userInfo.user_type;
        if (!userRole || !allowedRoles.includes(userRole)) {
            return <>{fallback}</>;
        }
    }

    return <>{children}</>;
}

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

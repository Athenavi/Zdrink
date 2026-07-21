'use client';

import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {useUserStore} from '@/stores/user';
import {AdminSidebar} from '@/components/AdminSidebar';
import {AdminHeader} from '@/components/AdminHeader';
import Loading from '@/components/Loading';

const ADMIN_ROLES = ['super_admin', 'shop_owner', 'shop_staff'];

export default function AdminLayout({children}: { children: React.ReactNode }) {
    const {isLoggedIn, userInfo} = useUserStore();
    const router = useRouter();

    useEffect(() => {
        if (typeof isLoggedIn !== 'undefined' && !isLoggedIn) {
            router.replace('/login');
        }
    }, [isLoggedIn, router]);

    if (typeof isLoggedIn === 'undefined' || !isLoggedIn) {
        return <Loading/>;
    }

    const userType = userInfo?.user_type;
    if (userType && !ADMIN_ROLES.includes(userType)) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-destructive">无权访问</h2>
                    <p className="mt-2 text-muted-foreground">您的账号没有商家管理权限</p>
                    <button
                        className="mt-4 text-sm text-primary hover:underline"
                        onClick={() => router.push('/home')}
                    >
                        返回首页
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen overflow-hidden">
            <AdminSidebar/>
            <div className="flex flex-1 flex-col overflow-hidden">
                <AdminHeader/>
                <main className="flex-1 overflow-y-auto bg-muted/30 p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}

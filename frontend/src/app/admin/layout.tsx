'use client';

import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {useUserStore} from '@/stores/user';
import {AdminSidebar} from '@/components/AdminSidebar';
import {AdminHeader} from '@/components/AdminHeader';
import Loading from '@/components/Loading';
import {Toaster} from '@/components/ui/sonner';
import {Menu} from 'lucide-react';
import {Button} from '@/components/ui/button';

const ADMIN_ROLES = ['super_admin', 'shop_owner', 'shop_staff'];

export default function AdminLayout({children}: { children: React.ReactNode }) {
    const {isLoggedIn, userInfo} = useUserStore();
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);

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
            {/* 移动端遮罩 */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* 侧边栏：桌面端嵌入 flex 流，移动端滑出抽屉 */}
            <div
                className={`fixed inset-y-0 left-0 z-50 transition-transform duration-200 lg:relative lg:z-auto lg:shrink-0 ${
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                }`}>
                <AdminSidebar onClose={() => setSidebarOpen(false)}/>
            </div>

            <div className="flex flex-1 flex-col overflow-hidden">
                <header className="flex h-14 items-center justify-between border-b bg-card px-4 lg:px-6">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="lg:hidden"
                            onClick={() => setSidebarOpen(true)}
                        >
                            <Menu size={20}/>
                        </Button>
                        <div className="text-sm text-muted-foreground"/>
                    </div>
                    <AdminHeader/>
                </header>
                <main className="flex-1 overflow-y-auto bg-muted/30">
                    <div className="mx-auto w-full max-w-7xl p-4 lg:p-6">
                        {children}
                    </div>
                </main>
            </div>
            <Toaster/>
        </div>
    );
}

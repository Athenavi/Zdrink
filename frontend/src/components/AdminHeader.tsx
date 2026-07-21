'use client';

import {useRouter} from 'next/navigation';
import {useUserStore} from '@/stores/user';
import {Button} from '@/components/ui/button';
import {LogOut, User} from 'lucide-react';

export function AdminHeader() {
    const {userInfo, logout} = useUserStore();
    const router = useRouter();

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    return (
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
                <User size={16} className="text-muted-foreground"/>
                <span className="hidden sm:inline">{userInfo?.username || '管理员'}</span>
                <span className="sm:hidden">{userInfo?.username?.slice(0, 4) || '管理员'}</span>
                {userInfo?.user_type === 'shop_owner' && (
                    <span
                        className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        店主
                    </span>
                )}
                {userInfo?.user_type === 'super_admin' && (
                    <span
                        className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        超级管理员
                    </span>
                )}
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} title="退出登录">
                <LogOut size={16}/>
            </Button>
        </div>
    );
}

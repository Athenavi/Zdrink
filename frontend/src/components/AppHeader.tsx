'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {ChevronLeft, Menu, ShoppingCart, User} from 'lucide-react';
import {useUserStore} from '@/stores/user';
import {useCartStore} from '@/stores/cart';

interface AppHeaderProps {
    title?: string;
    showBack?: boolean;
    showCart?: boolean;
}

export default function AppHeader({
                                      title = 'Zdrink 点餐',
                                      showBack = true,
                                      showCart = false
                                  }: AppHeaderProps) {
    const pathname = usePathname();
    const userStore = useUserStore();
    const cartStore = useCartStore();

    const isLoggedIn = userStore.isLoggedIn;
    const cartQuantity = cartStore.totalQuantity;

    return (
        <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
            <div className="flex items-center justify-between h-14 px-4">
                {/* 左侧：返回按钮 */}
                <div className="flex items-center space-x-3">
                    {showBack && pathname !== '/' && pathname !== '/home' ? (
                        <button
                            onClick={() => window.history.back()}
                            className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
                            aria-label="返回"
                        >
                            <ChevronLeft className="w-6 h-6"/>
                        </button>
                    ) : (
                        <button
                            className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors md:hidden"
                            aria-label="菜单"
                        >
                            <Menu className="w-6 h-6"/>
                        </button>
                    )}

                    <h1 className="text-lg font-semibold">{title}</h1>
                </div>

                {/* 右侧：功能按钮 */}
                <div className="flex items-center space-x-2">
                    {showCart && (
                        <Link
                            href="/cart"
                            className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
                            aria-label="购物车"
                        >
                            <ShoppingCart className="w-6 h-6"/>
                            {cartQuantity > 0 && (
                                <span
                                    className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                  {cartQuantity > 99 ? '99+' : cartQuantity}
                </span>
                            )}
                        </Link>
                    )}

                    <Link
                        href={isLoggedIn ? '/profile' : '/login'}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        aria-label="用户中心"
                    >
                        <User className="w-6 h-6"/>
                    </Link>
                </div>
            </div>
        </header>
    );
}

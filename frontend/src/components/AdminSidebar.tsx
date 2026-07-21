'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {cn} from '@/lib/utils';
import {
    BarChart3,
    ChevronLeft,
    ChevronRight,
    LayoutDashboard,
    Package,
    Printer,
    Settings,
    ShoppingCart,
    Store,
    TicketPercent,
    Users,
} from 'lucide-react';
import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {useUserStore} from '@/stores/user';

interface NavItem {
    label: string;
    href: string;
    icon: React.ReactNode;
    permissions?: string[];
}

const navItems: NavItem[] = [
    {label: '仪表盘', href: '/admin/dashboard', icon: <LayoutDashboard size={18}/>},
    {
        label: '订单管理',
        href: '/admin/orders',
        icon: <ShoppingCart size={18}/>,
        permissions: ['order_manage', 'order_process']
    },
    {label: '商品管理', href: '/admin/products', icon: <Package size={18}/>, permissions: ['product_manage']},
    {label: '客户管理', href: '/admin/customers', icon: <Users size={18}/>, permissions: ['customer_manage']},
    {label: '优惠促销', href: '/admin/coupons', icon: <TicketPercent size={18}/>, permissions: ['product_manage']},
    {label: '打印管理', href: '/admin/printing', icon: <Printer size={18}/>, permissions: ['setting_manage']},
    {label: '店铺设置', href: '/admin/settings', icon: <Settings size={18}/>, permissions: ['setting_manage']},
    {label: '数据报表', href: '/admin/reports', icon: <BarChart3 size={18}/>, permissions: ['report_view']},
];

interface AdminSidebarProps {
    onClose?: () => void;
}

export function AdminSidebar({onClose}: AdminSidebarProps) {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const userRole = useUserStore((state) => state.userInfo?.user_type);

    return (
        <aside
            data-state={collapsed ? 'collapsed' : 'expanded'}
            className={cn(
                'flex flex-col border-r bg-card transition-all duration-200',
                collapsed ? 'w-16' : 'w-56'
            )}
        >
            {/* Logo 区域 */}
            <div className="flex h-14 items-center justify-between gap-2 border-b px-4">
                <div className="flex items-center gap-2">
                    <Store size={22} className="shrink-0 text-primary"/>
                    {!collapsed && (
                        <span className="truncate text-sm font-semibold">商家管理</span>
                    )}
                </div>
                {onClose && (
                    <button onClick={onClose} className="lg:hidden p-1 rounded-md hover:bg-muted">
                        <ChevronLeft size={16}/>
                    </button>
                )}
            </div>

            {/* 导航菜单 */}
            <nav className="flex-1 space-y-1 overflow-y-auto p-2">
                {navItems.filter(item => !item.permissions || item.permissions.includes(userRole)).map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                                isActive
                                    ? 'bg-primary/10 text-primary font-medium'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            )}
                            title={collapsed ? item.label : undefined}
                        >
                            {item.icon}
                            {!collapsed && <span className="truncate">{item.label}</span>}
                        </Link>
                    );
                })}
            </nav>

            {/* 折叠按钮 */}
            <div className="border-t p-2">
                <Button
                    variant="ghost"
                    size="icon"
                    className="w-full justify-center"
                    onClick={() => setCollapsed(!collapsed)}
                >
                    {collapsed ? <ChevronRight size={16}/> : <ChevronLeft size={16}/>}
                </Button>
            </div>
        </aside>
    );
}

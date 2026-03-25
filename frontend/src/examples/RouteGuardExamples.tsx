/**
 * 路由守卫和权限控制使用示例
 */

'use client';

import {useSession} from 'next-auth/react';
import {AdminGuard, AuthGuard, GuestGuard, PosGuard, RoleGuard} from '@/components/guards/AuthGuard';
import {canPerformAction, hasPermission, isAdmin} from '@/lib/utils/permissions';

/**
 * 示例 1: 使用 AuthGuard 保护需要登录的页面
 */
function ProfilePage() {
    return (
        <AuthGuard>
            <div>
                <h1>个人中心</h1>
                <p>这是受保护的页面，只有登录用户可以访问</p>
            </div>
        </AuthGuard>
    );
}

/**
 * 示例 2: 使用 GuestGuard 保护登录页（已登录用户不能访问）
 */
function LoginPage() {
    return (
        <GuestGuard>
            <div>
                <h1>登录页面</h1>
                <p>已登录用户会被重定向到首页</p>
            </div>
        </GuestGuard>
    );
}

/**
 * 示例 3: 使用 RoleGuard 限制特定角色
 */
function ManagerDashboard() {
    return (
        <RoleGuard allowedRoles={['admin', 'manager']}>
            <div>
                <h1>经理仪表盘</h1>
                <p>仅管理员和经理可以访问</p>
            </div>
        </RoleGuard>
    );
}

/**
 * 示例 4: 使用 PosGuard 限制收银员功能
 */
function POSCheckoutPage() {
    return (
        <PosGuard>
            <div>
                <h1>POS 收银台</h1>
                <p>仅管理员和收银员可以使用</p>
            </div>
        </PosGuard>
    );
}

/**
 * 示例 5: 使用 AdminGuard 限制管理员功能
 */
function AdminSettingsPage() {
    return (
        <AdminGuard>
            <div>
                <h1>系统设置</h1>
                <p>仅管理员可以访问</p>
            </div>
        </AdminGuard>
    );
}

/**
 * 示例 6: 在组件内根据权限显示不同内容
 */
function ProductList() {
    const {data: session} = useSession();

    return (
        <div>
            <h1>商品列表</h1>

            {/* 所有用户可见 */}
            <ul>
                <li>商品 1</li>
                <li>商品 2</li>
            </ul>

            {/* 仅登录用户可见 */}
            {session && (
                <button>加入购物车</button>
            )}

            {/* 有写入权限的用户可见（编辑按钮） */}
            {hasPermission(session, 'write') && (
                <button>编辑商品</button>
            )}

            {/* 有删除权限的用户可见（删除按钮） */}
            {hasPermission(session, 'delete') && (
                <button>删除商品</button>
            )}

            {/* 管理员可见（特殊功能） */}
            {isAdmin(session) && (
                <div className="admin-panel">
                    <button>批量导入商品</button>
                    <button>导出商品数据</button>
                </div>
            )}
        </div>
    );
}

/**
 * 示例 7: 根据权限控制操作
 */
function OrderActions({orderId}: { orderId: number }) {
    const {data: session} = useSession();

    const handleDeleteOrder = async () => {
        if (!canPerformAction(session, 'order', 'delete')) {
            alert('无权删除订单');
            return;
        }

        // 执行删除操作
        await deleteOrder(orderId);
    };

    return (
        <div>
            <button onClick={handleDeleteOrder}>
                删除订单
            </button>
        </div>
    );
}

/**
 * 示例 8: 动态菜单 - 根据权限显示菜单项
 */
function NavigationMenu() {
    const {data: session} = useSession();

    const menuItems = [
        {id: 'home', label: '首页', href: '/home'},
        {id: 'products', label: '商品', href: '/products'},
        {id: 'cart', label: '购物车', href: '/cart', requiresAuth: true},
        {id: 'orders', label: '订单', href: '/orders', requiresAuth: true},
        {
            id: 'pos',
            label: 'POS 收银',
            href: '/pos/checkout',
            requiresAuth: true,
            requiredRole: ['admin', 'cashier']
        },
        {
            id: 'admin',
            label: '管理后台',
            href: '/admin',
            requiresAuth: true,
            requiredRole: ['admin']
        },
    ];

    return (
        <nav>
            {menuItems.map(item => {
                // 检查是否需要登录
                if (item.requiresAuth && !session) {
                    return null;
                }

                // 检查角色要求
                if (item.requiredRole) {
                    const hasRole = Array.isArray(item.requiredRole)
                        ? item.requiredRole.includes(session?.user?.role as string)
                        : session?.user?.role === item.requiredRole;

                    if (!hasRole) {
                        return null;
                    }
                }

                return (
                    <a key={item.id} href={item.href}>
                        {item.label}
                    </a>
                );
            })}
        </nav>
    );
}

/**
 * 示例 9: 自定义 fallback 的守卫
 */
function PremiumFeatures() {
    return (
        <AuthGuard
            requiredRole={['admin', 'manager']}
            fallback={<div>请先登录或升级账户以访问此功能</div>}
        >
            <div>
                <h1>高级功能</h1>
                <p>仅限管理员和经理使用</p>
            </div>
        </AuthGuard>
    );
}

/**
 * 示例 10: 组合使用多个守卫
 */
function Dashboard() {
    const {data: session} = useSession();

    return (
        <AuthGuard>
            <div>
                <h1>仪表盘</h1>

                {/* 普通功能 - 所有登录用户可用 */}
                <section>
                    <h2>我的数据</h2>
                    {/* ... */}
                </section>

                {/* 管理功能 - 仅管理员可用 */}
                {isAdmin(session) && (
                    <section>
                        <h2>管理面板</h2>
                        <button>用户管理</button>
                        <button>系统设置</button>
                    </section>
                )}

                {/* 收银功能 - 管理员和收银员可用 */}
                {session && ['admin', 'cashier'].includes((session.user as any).role as string) && (
                    <section>
                        <h2>收银台</h2>
                        <button>快速结账</button>
                    </section>
                )}
            </div>
        </AuthGuard>
    );
}

/**
 * 示例 11: 页面级守卫（在 page.tsx 中使用）
 */
export default function ProtectedPage() {
    return (
        <AuthGuard>
            <main>
                <h1>受保护的页面</h1>
                <p>整个页面都需要登录才能访问</p>
            </main>
        </AuthGuard>
    );
}

/**
 * 示例 12: 使用权限工具函数进行条件渲染
 */
function ActionButtons({resourceId}: { resourceId: number }) {
    const {data: session} = useSession();

    const canRead = hasPermission(session, 'read');
    const canWrite = hasPermission(session, 'write');
    const canDelete = hasPermission(session, 'delete');

    return (
        <div className="action-buttons">
            {canRead && <button>查看</button>}
            {canWrite && <button>编辑</button>}
            {canDelete && (
                <button
                    onClick={() => handleDelete(resourceId)}
                    className="text-red-600"
                >
                    删除
                </button>
            )}
        </div>
    );
}

// 辅助函数
async function deleteOrder(orderId: number) {
    // 删除订单逻辑
}

async function handleDelete(resourceId: number) {
    // 删除资源逻辑
}

// 导出示例组件
export {
    ProfilePage,
    LoginPage,
    ManagerDashboard,
    POSCheckoutPage,
    AdminSettingsPage,
    ProductList,
    OrderActions,
    NavigationMenu,
    PremiumFeatures,
    Dashboard,
    ActionButtons
};

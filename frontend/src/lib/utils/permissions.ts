/**
 * 权限管理工具函数
 */

import {Session} from 'next-auth';

/**
 * 用户角色枚举
 */
export enum UserRole {
    ADMIN = 'admin',
    MANAGER = 'manager',
    CASHIER = 'cashier',
    CUSTOMER = 'customer'
}

/**
 * 权限级别枚举
 */
export enum PermissionLevel {
    READ = 'read',
    WRITE = 'write',
    DELETE = 'delete',
    ADMIN = 'admin'
}

/**
 * 角色权限映射表
 */
export const ROLE_PERMISSIONS: Record<string, string[]> = {
    [UserRole.ADMIN]: ['*'], // 所有权限
    [UserRole.MANAGER]: ['read', 'write', 'delete'],
    [UserRole.CASHIER]: ['read', 'write'],
    [UserRole.CUSTOMER]: ['read']
};

/**
 * 检查用户是否有指定权限
 * @param session - 用户会话
 * @param permission - 所需权限
 * @returns 是否有权限
 */
export const hasPermission = (session: Session | null, permission: string): boolean => {
    if (!session?.user?.role) {
        return false;
    }

    const userRole = session.user.role as string;
    const permissions = ROLE_PERMISSIONS[userRole] || [];

    // 管理员拥有所有权限
    if (permissions.includes('*')) {
        return true;
    }

    return permissions.includes(permission);
};

/**
 * 检查用户是否是管理员
 */
export const isAdmin = (session: Session | null): boolean => {
    return session?.user?.role === UserRole.ADMIN;
};

/**
 * 检查用户是否是经理
 */
export const isManager = (session: Session | null): boolean => {
    return session?.user?.role === UserRole.MANAGER;
};

/**
 * 检查用户是否是收银员
 */
export const isCashier = (session: Session | null): boolean => {
    return session?.user?.role === UserRole.CASHIER;
};

/**
 * 检查用户是否是客户
 */
export const isCustomer = (session: Session | null): boolean => {
    return session?.user?.role === UserRole.CUSTOMER;
};

/**
 * 检查用户是否有任何指定角色
 */
export const hasAnyRole = (session: Session | null, roles: string[]): boolean => {
    if (!session?.user?.role) {
        return false;
    }

    return roles.includes(session.user.role as string);
};

/**
 * 检查用户是否同时拥有所有指定角色（理论上不可能，但保留此函数）
 */
export const hasAllRoles = (session: Session | null, roles: string[]): boolean => {
    if (!session?.user?.role) {
        return false;
    }

    // 用户只能有一个角色
    return roles.includes(session.user.role as string);
};

/**
 * 获取用户的权限列表
 */
export const getUserPermissions = (session: Session | null): string[] => {
    if (!session?.user?.role) {
        return [];
    }

    const userRole = session.user.role as string;
    return ROLE_PERMISSIONS[userRole] || [];
};

/**
 * 检查用户是否可以执行特定操作
 * @param session - 用户会话
 * @param resource - 资源类型 (e.g., 'order', 'product', 'user')
 * @param action - 操作类型 (e.g., 'create', 'update', 'delete')
 * @returns 是否可以执行
 */
export const canPerformAction = (
    session: Session | null,
    resource: string,
    action: string
): boolean => {
    if (!session?.user?.role) {
        return false;
    }

    const userRole = session.user.role as string;

    // 管理员可以执行所有操作
    if (userRole === UserRole.ADMIN) {
        return true;
    }

    // 特定资源的权限检查
    const permissionKey = `${resource}:${action}`;

    // 这里可以根据具体业务定义更细粒度的权限
    const rolePermissions = ROLE_PERMISSIONS[userRole] || [];

    if (rolePermissions.includes('*')) {
        return true;
    }

    // 简化的权限检查逻辑
    switch (action) {
        case 'read':
            return rolePermissions.includes('read');
        case 'create':
        case 'update':
            return rolePermissions.includes('write');
        case 'delete':
            return rolePermissions.includes('delete');
        default:
            return false;
    }
};

/**
 * 获取用户可以访问的菜单项
 */
export const getAccessibleMenuItems = (
    session: Session | null,
    menuItems: Array<{ id: string; label: string; requiredPermission?: string; requiredRole?: string }>
) => {
    if (!session) {
        return [];
    }

    return menuItems.filter(item => {
        if (item.requiredPermission) {
            return hasPermission(session, item.requiredPermission);
        }
        if (item.requiredRole) {
            return session.user.role === item.requiredRole;
        }
        return true; // 没有权限要求的菜单项对所有登录用户可见
    });
};

/**
 * 权限检查 Hook（需要在组件中使用）
 * 由于这是纯工具文件，不包含 Hook 实现
 * 请在组件中使用 useAuth() 或 useSession() 获取 session 后调用上述函数
 */

/**
 * 示例用法：
 *
 * // 在组件中
 * const { data: session } = useSession();
 *
 * if (hasPermission(session, 'delete')) {
 *   // 显示删除按钮
 * }
 *
 * if (isAdmin(session)) {
 *   // 显示管理员功能
 * }
 *
 * if (canPerformAction(session, 'order', 'delete')) {
 *   // 允许删除订单
 * }
 */

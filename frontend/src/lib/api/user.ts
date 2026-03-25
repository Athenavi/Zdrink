import apiClient from '@/lib/api';
import {User} from '@/types';

export const userApi = {
    // 登录
    login(credentials: { username: string; password: string }) {
        return apiClient.post<{ access: string; refresh: string }>('/auth/login/', credentials);
    },

    // 注册
    register(userData: { username: string; email: string; password: string }) {
        return apiClient.post('/auth/register/', userData);
    },

    // 获取当前用户信息
    getCurrentUser() {
        return apiClient.get<User>('/auth/me/');
    },

    // 更新用户信息
    updateProfile(userData: Partial<User>) {
        return apiClient.patch<User>('/auth/profile/update/', userData);
    },

    // 修改密码
    changePassword(passwordData: { old_password: string; new_password: string }) {
        return apiClient.post('/auth/change-password/', passwordData);
    },

    // 退出登录
    logout() {
        return apiClient.post('/auth/logout/');
    },

    // 获取会员信息
    getMembershipInfo() {
        return apiClient.get('/users/membership-info/');
    },

    // 签到
    signin() {
        return apiClient.post('/users/signin-earn-points/');
    },

    // 获取订单列表（用于统计）
    getOrders(params?: { status?: string }) {
        return apiClient.get('/orders/orders/my_orders/', {params});
    },

    // 获取优惠券列表
    getCoupons(params?: { status?: string }) {
        return apiClient.get('/promotions/coupons/my/', {params});
    }
};

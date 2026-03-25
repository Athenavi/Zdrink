import apiClient from '@/lib/api';
import {ApiResponse, Shop} from '@/types';

export const shopApi = {
    // 获取店铺列表
    getShops(params?: { is_active?: boolean; limit?: number; search?: string }) {
        return apiClient.get<ApiResponse<Shop>>('/shops/', {params});
    },

    // 获取店铺详情
    getShop(shopId: number) {
        return apiClient.get<Shop>(`/shops/${shopId}/`);
    },

    // 获取当前用户关联的店铺
    getCurrentShops() {
        return apiClient.get<Shop[]>('/shops/current/');
    }
};

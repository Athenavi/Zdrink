import apiClient from '@/lib/api';
import {ApiResponse, Product} from '@/types';

export const productApi = {
    // 获取公开商品列表
    getPublicProducts(shopId: number, params?: {
        category?: number;
        page?: number;
        page_size?: number;
        search?: string;
    }) {
        return apiClient.get<ApiResponse<Product>>('/products/public/products/', {
            params: {...params, shop_id: shopId}
        });
    },

    // 获取商品分类
    getCategories(shopId: number) {
        return apiClient.get('/products/categories/', {
            params: {shop_id: shopId}
        });
    },

    // 获取商品详情
    getProduct(productId: number) {
        return apiClient.get<Product>(`/products/products/${productId}/`);
    }
};

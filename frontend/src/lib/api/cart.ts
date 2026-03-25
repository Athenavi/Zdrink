import apiClient from '@/lib/api';
import {ApiResponse, Cart, CartItem} from '@/types';

export const cartApi = {
    // 获取我的购物车
    getMyCart() {
        return apiClient.get<ApiResponse<Cart>>('/orders/carts/my_cart/');
    },

    // 添加到购物车
    addItem(itemData: {
        product_id: number;
        quantity: number;
        sku_id?: number | null;
        attribute_option_ids?: number[];
        customization?: string;
    }) {
        return apiClient.post<CartItem>('/orders/carts/add_item/', itemData);
    },

    // 更新购物车商品数量
    updateItem(itemId: number, itemData: { quantity: number }) {
        return apiClient.patch<CartItem>(`/orders/carts/items/${itemId}/`, itemData);
    },

    // 删除购物车商品
    removeItem(itemId: number) {
        return apiClient.delete(`/orders/carts/items/${itemId}/`);
    },

    // 清空购物车
    clearCart() {
        return apiClient.post('/orders/carts/clear/');
    }
};

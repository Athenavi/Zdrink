import apiClient from '@/lib/api';
import {ApiResponse, Order} from '@/types';

export const orderApi = {
    // 创建订单
    createOrder(orderData: {
        shop: number;
        items: Array<{ product: number; quantity: number; specifications?: any }>;
        table_number?: string;
        remark?: string;
    }) {
        return apiClient.post<Order>('/orders/orders/', orderData);
    },

    // 获取我的订单列表
    getOrders(params?: { status?: string; page?: number; page_size?: number }) {
        return apiClient.get<ApiResponse<Order>>('/orders/orders/my_orders/', {params});
    },

    // 获取订单详情
    getOrder(orderId: number) {
        return apiClient.get<Order>(`/orders/orders/${orderId}/`);
    },

    // 取消订单
    cancelOrder(orderId: number, data: { reason?: string } = {}) {
        return apiClient.post(`/orders/orders/${orderId}/cancel/`, data);
    },

    // 创建支付
    createPayment(paymentData: {
        order_id: number;
        payment_method: 'wechat' | 'alipay' | 'cash';
    }) {
        return apiClient.post('/payments/transactions/create_payment/', paymentData);
    }
};

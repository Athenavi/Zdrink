import apiClient from '@/lib/api';

export interface Coupon {
    id: number;
    name: string;
    code: string;
    coupon_type: 'fixed' | 'percentage' | 'shipping';
    value: number | string;
    max_discount?: number | string;
    min_order_amount: number | string;
    description?: string;
    valid_from: string;
    valid_until: string;
    total_quantity?: number;
    used_quantity?: number;
    is_active: boolean;
}

export interface UserCoupon {
    id: number;
    coupon: Coupon;
    status: 'available' | 'used' | 'expired';
    used_at?: string;
    created_at: string;
}

export const couponApi = {
    // 获取可领取的优惠券列表
    getAvailableCoupons() {
        return apiClient.get<Coupon[]>('/promotions/available-coupons/');
    },

    // 获取我的优惠券列表
    getMyCoupons(params?: { status?: string }) {
        return apiClient.get<UserCoupon[]>('/promotions/user-coupons/', {params});
    },

    // 获取可用的优惠券（用于下单）
    getAvailableForUse() {
        return apiClient.get<UserCoupon[]>('/promotions/user-coupons/available/');
    },

    // 领取优惠券
    claimCoupon(couponCode: string) {
        return apiClient.post<UserCoupon>('/promotions/user-coupons/claim/', {
            coupon_code: couponCode
        });
    },

    // 应用优惠券
    applyCoupon(data: {
        coupon_code: string;
        order_id?: number;
        cart_id?: number;
    }) {
        return apiClient.post<{
            coupon_id: number;
            coupon_code: string;
            discount_amount: number | string;
            user_coupon_id: number;
        }>('/promotions/apply-coupon/', data);
    }
};

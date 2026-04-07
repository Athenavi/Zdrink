import apiClient from '@/lib/api';

export interface Address {
    id: number;
    name: string;
    phone: string;
    province: string;
    city: string;
    district: string;
    detail: string;
    full_address?: string;
    is_default: boolean;
    label?: string;
}

export const addressApi = {
    // 获取地址列表
    getAddresses() {
        return apiClient.get<Address[]>('/users/addresses/');
    },

    // 获取地址详情
    getAddress(id: number) {
        return apiClient.get<Address>(`/users/addresses/${id}/`);
    },

    // 创建地址
    createAddress(data: Omit<Address, 'id' | 'full_address'>) {
        return apiClient.post<Address>('/users/addresses/', data);
    },

    // 更新地址
    updateAddress(id: number, data: Partial<Omit<Address, 'id'>>) {
        return apiClient.patch<Address>(`/users/addresses/${id}/`, data);
    },

    // 删除地址
    deleteAddress(id: number) {
        return apiClient.delete(`/users/addresses/${id}/`);
    },

    // 设置默认地址
    setDefaultAddress(id: number) {
        return apiClient.patch<Address>(`/users/addresses/${id}/`, {is_default: true});
    }
};

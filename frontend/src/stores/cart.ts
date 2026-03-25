import {create} from 'zustand';
import {cartApi} from '@/lib/api/cart';
import {Cart, CartItem} from '@/types';

interface CartState {
    cartItems: CartItem[];
    cartInfo: Cart | null;
    totalQuantity: number;
    totalPrice: number;

    // Actions
    getCart: () => Promise<void>;
    addToCart: (productData: {
        product: number;
        quantity: number;
        sku_id?: number | null;
        attribute_option_ids?: number[];
        customization?: string;
    }) => Promise<void>;
    updateCartItem: (itemId: number, quantity: number) => Promise<void>;
    removeCartItem: (itemId: number) => Promise<void>;
    clearCart: () => Promise<void>;
}

export const useCartStore = create<CartState>((set, get) => ({
    cartItems: [],
    cartInfo: null,
    totalQuantity: 0,
    totalPrice: 0,

    // 获取购物车
    getCart: async () => {
        try {
            const response = await cartApi.getMyCart();
            const data = response.data as any;
            set({
                cartInfo: data.results || data,
                cartItems: data.items || [],
                totalQuantity: data.total_quantity || 0,
                totalPrice: data.total_price || 0
            });
        } catch (error: any) {
            if (error.response?.status === 401 || error.response?.status === 403) {
                console.log('用户未登录，无法获取购物车');
            } else {
                throw error;
            }
        }
    },

    // 添加到购物车
    addToCart: async (productData) => {
        try {
            // 转换字段名：product -> product_id
            const formattedData = {
                product_id: productData.product,
                quantity: productData.quantity,
                sku_id: productData.sku_id ?? null,
                attribute_option_ids: productData.attribute_option_ids || [],
                customization: productData.customization || ''
            };
            await cartApi.addItem(formattedData);
            await get().getCart();
        } catch (error: any) {
            console.error('添加购物车失败:', error);
            throw error;
        }
    },

    // 更新购物车商品数量
    updateCartItem: async (itemId, quantity) => {
        try {
            if (quantity <= 0) {
                await get().removeCartItem(itemId);
            } else {
                await cartApi.updateItem(itemId, {quantity});
                await get().getCart();
            }
        } catch (error: any) {
            console.error('更新购物车失败:', error);
            throw error;
        }
    },

    // 删除购物车商品
    removeCartItem: async (itemId) => {
        try {
            await cartApi.removeItem(itemId);
            await get().getCart();
        } catch (error: any) {
            console.error('删除购物车失败:', error);
            throw error;
        }
    },

    // 清空购物车
    clearCart: async () => {
        try {
            await cartApi.clearCart();
            set({
                cartItems: [],
                cartInfo: null,
                totalQuantity: 0,
                totalPrice: 0
            });
        } catch (error: any) {
            console.error('清空购物车失败:', error);
            throw error;
        }
    },
}));

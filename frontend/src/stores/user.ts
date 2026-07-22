import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import {userApi} from '@/lib/api/user';
import {AuthTokens, User} from '@/types';

interface UserState {
    userInfo: User | null;
    token: string | null;
    isLoggedIn: boolean;
    selectedShop: { id: number; name: string; shop_type: string } | null;
    availableShops: { id: number; name: string; shop_type: string }[];

    // Actions
    login: (credentials: { username: string; password: string }) => Promise<AuthTokens>;
    register: (userData: { username: string; email: string; password: string }) => Promise<any>;
    getCurrentUser: () => Promise<User>;
    updateUser: (userData: Partial<User>) => Promise<void>;
    logout: () => void;
    initUser: () => Promise<void>;
    setToken: (token: string) => void;
    setSelectedShop: (shop: { id: number; name: string; shop_type: string } | null) => void;
    fetchAvailableShops: () => Promise<void>;
}

export const useUserStore = create<UserState>()(
    persist(
        (set, get) => ({
            userInfo: null,
            token: null,
            isLoggedIn: false,
            selectedShop: null,
            availableShops: [],

            // 登录
            login: async (credentials) => {
                try {
                    console.log('开始登录...', credentials.username);

                    const response = await userApi.login(credentials);
                    const {access, refresh, user} = response.data;

                    console.log('登录成功，保存 token');
                    console.log('用户信息:', user);

                    // 仅使用 cookie 存储 token（与 middleware 保持一致）
                    set({token: access, isLoggedIn: true, userInfo: user});

                    // 后端已在 HttpOnly cookie 中设置 token，前端无需再设置

                    return response.data;
                } catch (error: any) {
                    console.error('登录失败:', error.response?.data);
                    throw error;
                }
            },

            // 注册
            register: async (userData) => {
                try {
                    const response = await userApi.register(userData);
                    return response.data;
                } catch (error: any) {
                    console.error('注册失败:', error.response?.data);
                    throw error;
                }
            },

            // 获取当前用户信息
            getCurrentUser: async () => {
                try {
                    const response = await userApi.getCurrentUser();
                    set({userInfo: response.data});
                    return response.data;
                } catch (error: any) {
                    if (error.response?.status === 401) {
                        get().logout();
                    }
                    throw error;
                }
            },

            // 更新用户信息
            updateUser: async (userData) => {
                try {
                    const response = await userApi.updateProfile(userData);
                    set({userInfo: {...get().userInfo!, ...response.data}});
                } catch (error: any) {
                    console.error('更新用户信息失败:', error);
                    throw error;
                }
            },

            // 退出登录
            logout: () => {
                console.log('退出登录');
                set({userInfo: null, token: null, isLoggedIn: false});

                // 清除 cookie
                document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
                document.cookie = 'refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
            },

            // 初始化用户信息
            initUser: async () => {
                // 从 Zustand store 获取 token（由 persist 从 localStorage 恢复）
                const token = get().token;

                if (token) {
                    try {
                        console.log('开始初始化用户信息...');
                        set({token, isLoggedIn: true});
                        await get().getCurrentUser();
                        console.log('用户初始化成功:', get().userInfo?.username);
                    } catch (error: any) {
                        console.error('初始化用户信息失败:', error.message);
                        if (error.response?.status === 401) {
                            console.log('Token 已失效，清除本地存储');
                            get().logout();
                        }
                    }
                } else {
                    console.log('未检测到 token，跳过初始化');
                }
            },

            // 设置 token
            setToken: (token: string) => {
                set({token, isLoggedIn: true});
                // 后端已在 HttpOnly cookie 中设置 token，前端无需再设置
            },

            // 选择当前店铺（同时设置 X-Tenant cookie）
            setSelectedShop: (shop) => {
                set({selectedShop: shop});
                if (shop && typeof window !== 'undefined') {
                    document.cookie = `x-tenant=${shop.id}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
                }
            },

            // 获取用户可用的店铺列表
            fetchAvailableShops: async () => {
                try {
                    const {shopApi} = await import('@/lib/api/shop');
                    const response = await shopApi.getCurrentShops();
                    const shops = response.data || [];
                    set({availableShops: shops});
                    // 如果只有一个店铺，自动选中
                    if (shops.length === 1) {
                        get().setSelectedShop(shops[0]);
                    }
                } catch (e) {
                    console.error('获取店铺列表失败:', e);
                }
            },
        }),
        {
            name: 'user-storage', // localStorage 中的 key
            // 持久化 token 和登录状态（token 存 localStorage 是标准 SPA 实践，
            // 因为 HttpOnly cookie 无法被 JavaScript 读取来设置 Authorization 头）
            partialize: (state) => ({
                token: state.token,
                isLoggedIn: state.isLoggedIn,
                selectedShop: state.selectedShop,
                availableShops: state.availableShops,
            }),
        }
    )
);

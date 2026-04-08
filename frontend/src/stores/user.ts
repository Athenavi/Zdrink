import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import {userApi} from '@/lib/api/user';
import {AuthTokens, User} from '@/types';

interface UserState {
    userInfo: User | null;
    token: string | null;
    isLoggedIn: boolean;

    // Actions
    login: (credentials: { username: string; password: string }) => Promise<AuthTokens>;
    register: (userData: { username: string; email: string; password: string }) => Promise<any>;
    getCurrentUser: () => Promise<User>;
    updateUser: (userData: Partial<User>) => Promise<void>;
    logout: () => void;
    initUser: () => Promise<void>;
    setToken: (token: string) => void;
}

export const useUserStore = create<UserState>()(
    persist(
        (set, get) => ({
            userInfo: null,
            token: null,
            isLoggedIn: false,

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

                    // 设置 cookie 供 Middleware 和 API 客户端使用
                    document.cookie = `token=${access}; path=/; max-age=${60 * 60 * 24 * 7}`; // 7 天
                    document.cookie = `refresh_token=${refresh}; path=/; max-age=${60 * 60 * 24 * 30}`; // 30 天

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
                document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                document.cookie = 'refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            },

            // 初始化用户信息
            initUser: async () => {
                // 仅从 cookie 获取 token
                const token = get().token || document.cookie
                    .split('; ')
                    .find(row => row.startsWith('token='))
                    ?.split('=')[1];

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
                // 仅使用 cookie 存储
                document.cookie = `token=${token}; path=/; max-age=${60 * 60 * 24 * 7}`;
            },
        }),
        {
            name: 'user-storage', // localStorage 中的 key
            // 由于 token 存储在 cookie 中，这里只持久化登录状态
            partialize: (state) => ({isLoggedIn: state.isLoggedIn}),
        }
    )
);

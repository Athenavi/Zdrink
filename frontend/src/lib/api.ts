import axios, {AxiosError, AxiosRequestConfig} from 'axios';
import {ApiError} from '@/types';

// 创建 axios 实例
const apiClient = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    timeout: 15000,
    withCredentials: true, // 允许携带 cookie
    xsrfCookieName: 'csrftoken', // CSRF cookie 名称
    xsrfHeaderName: 'X-CSRFToken', // CSRF header 名称
});

// API 路径前缀配置（统一管理所有 API 路径）
const API_PREFIX = '/api';

// 路径处理函数：确保所有 API 请求都带有 /api 前缀
function processUrl(url: string): string {
    // 如果已经是完整 URL（包含 http），则不处理
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }

    // 如果已经包含 /api 前缀，直接返回
    if (url.startsWith(API_PREFIX)) {
        return url;
    }

    // 否则添加 /api 前缀
    // 确保 url 以 / 开头
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    return `${API_PREFIX}${cleanUrl}`;
}

// 请求拦截器 - 统一处理 API 路径前缀和认证信息
apiClient.interceptors.request.use(
    (config) => {
        // 处理 URL 路径，添加 /api 前缀
        config.url = processUrl(config.url || '');

        // 从 localStorage 获取 token（客户端）
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }

            // 从 cookie 获取租户信息并添加到请求头
            const tenant = document.cookie
                .split('; ')
                .find(row => row.startsWith('x-tenant='))
                ?.split('=')[1];

            if (tenant) {
                config.headers['X-Tenant'] = tenant;
            }
        }

        return config;
    },
    (error) => {
        console.error('请求错误:', error);
        return Promise.reject(error);
    }
);

// 响应拦截器
apiClient.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error: AxiosError<ApiError>) => {
        const {response} = error;

        if (response) {
            const {status, data} = response;

            switch (status) {
                case 401:
                    // 未授权，清除 token 并跳转到登录页
                    if (typeof window !== 'undefined') {
                        localStorage.removeItem('token');
                        localStorage.removeItem('refresh_token');

                        // 如果当前不在登录页，跳转到登录页
                        if (!window.location.pathname.includes('/login')) {
                            window.location.href = '/login';
                        }
                    }
                    break;

                case 403:
                    console.error('没有权限访问');
                    break;

                case 404:
                    console.error('请求的资源不存在');
                    break;

                case 500:
                    console.error('服务器内部错误');
                    break;

                default:
                    console.error(data?.detail || data?.message || '请求失败');
            }
        } else {
            console.error('网络错误，请检查网络连接');
        }

        return Promise.reject(error);
    }
);

// 导出配置的 axios实例
export default apiClient;

// 导出一个通用的 API 调用函数
export async function apiRequest<T = any>(
    endpoint: string,
    options?: AxiosRequestConfig
): Promise<T> {
    const response = await apiClient.get<T>(endpoint, options);
    return response.data;
}

'use client';

import {useEffect, useState} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import {useUserStore} from '@/stores/user';
import apiClient from '@/lib/api';

export default function AlipayCallbackPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [error, setError] = useState('');
    const setToken = useUserStore((state) => state.setToken);
    const initUser = useUserStore((state) => state.initUser);

    useEffect(() => {
        const handleCallback = async () => {
            const code = searchParams.get('auth_code');

            if (!code) {
                setError('授权失败，未获取到授权码');
                setTimeout(() => {
                    router.push('/login');
                }, 3000);
                return;
            }

            try {
                // 调用后端接口，使用code换取用户信息和token
                const response = await apiClient.post('/users/social/callback/', {
                    code: code,
                    provider: 'alipay',
                    platform: 'pc'
                });

                const {access, refresh, user, is_new} = response.data;

                // 保存token
                localStorage.setItem('access_token', access);
                localStorage.setItem('refresh_token', refresh);
                setToken(access);

                // 初始化用户信息
                await initUser();

                // 跳转到首页或之前的页面
                const callbackUrl = searchParams.get('callbackUrl') || '/home';
                router.push(callbackUrl);

            } catch (err: any) {
                console.error('支付宝登录失败:', err);
                setError(err.response?.data?.error || '登录失败，请重试');

                setTimeout(() => {
                    router.push('/login');
                }, 3000);
            }
        };

        handleCallback();
    }, [searchParams, router, setToken, initUser]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
                {error ? (
                    <>
                        <div className="text-red-500 text-6xl mb-4">✕</div>
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">登录失败</h2>
                        <p className="text-gray-600 mb-4">{error}</p>
                        <p className="text-sm text-gray-500">3秒后自动跳转到登录页...</p>
                    </>
                ) : (
                    <>
                        <div
                            className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
                        <h2 className="text-2xl font-semibold text-gray-800 mb-4">正在登录...</h2>
                        <p className="text-gray-600">请稍候，正在完成支付宝登录</p>
                    </>
                )}
            </div>
        </div>
    );
}

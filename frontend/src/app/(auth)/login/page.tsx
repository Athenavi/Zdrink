'use client';

import {Suspense, useState} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import Link from 'next/link';
import {useUserStore} from '@/stores/user';

export default function LoginPage() {
    return (
        <Suspense fallback={<div
            className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <div className="text-white text-xl">加载中...</div>
        </div>}>
            <LoginContent/>
        </Suspense>
    );
}

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const login = useUserStore((state) => state.login);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        username: '',
        password: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            console.log('尝试登录，用户名:', formData.username);
            await login(formData);
            // 登录成功，跳转到目标页面
            const callbackUrl = searchParams.get('callbackUrl') || searchParams.get('redirect') || '/home';
            router.push(callbackUrl);
        } catch (err: any) {
            console.error('登录失败:', err);
            console.error('错误响应:', err.response);
            console.error('错误数据:', err.response?.data);

            // 尝试获取具体的错误信息
            let errorMsg = '登录失败，请检查用户名和密码';

            if (err.response?.data) {
                const errorData = err.response.data;
                // 处理 Django REST Framework 的错误格式
                if (errorData.non_field_errors) {
                    errorMsg = errorData.non_field_errors[0];
                } else if (errorData.detail) {
                    errorMsg = errorData.detail;
                } else if (typeof errorData === 'object') {
                    // 处理字段级别的错误
                    const firstField = Object.keys(errorData)[0];
                    if (firstField && errorData[firstField][0]) {
                        errorMsg = errorData[firstField][0];
                    }
                }
            }

            if (err.response?.data) {
                const errorData = err.response.data;
                // Django DRF 可能返回字段级别的错误
                if (typeof errorData === 'object') {
                    // 尝试获取 username 或 password 字段的错误
                    errorMsg = errorData.username?.[0]
                        || errorData.password?.[0]
                        || errorData.detail
                        || errorData.message
                        || JSON.stringify(errorData);
                } else if (typeof errorData === 'string') {
                    errorMsg = errorData;
                }
            } else if (err.message) {
                errorMsg = err.message;
            }

            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    // 微信登录
    const handleWeixinLogin = () => {
        const redirectUri = encodeURIComponent(`${window.location.origin}/auth/callback/weixin`);
        const authUrl = `https://open.weixin.qq.com/connect/qrconnect?appid=${process.env.NEXT_PUBLIC_WEIXIN_APP_ID}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_userinfo&state=STATE#wechat_redirect`;
        window.location.href = authUrl;
    };

    // 支付宝登录
    const handleAlipayLogin = () => {
        const redirectUri = encodeURIComponent(`${window.location.origin}/auth/callback/alipay`);
        const authUrl = `https://openauth.alipay.com/oauth2/publicAppAuthorize.htm?app_id=${process.env.NEXT_PUBLIC_ALIPAY_APP_ID}&scope=auth_user&redirect_uri=${redirectUri}`;
        window.location.href = authUrl;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-10">
                    <div className="inline-block">
                        <img
                            src="/logo.svg"
                            alt="Zdrink Logo"
                            className="w-20 h-20 mx-auto"
                        />
                    </div>
                    <h1 className="text-3xl font-bold text-white mt-4">Zdrink点餐</h1>
                </div>

                {/* 登录表单 */}
                <div className="bg-white rounded-lg shadow-xl p-8">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
                        用户登录
                    </h2>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {/* 注册成功提示 */}
                    {searchParams.get('registered') && (
                        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-600 rounded-lg text-sm">
                            注册成功，请登录
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                                用户名
                            </label>
                            <input
                                id="username"
                                type="text"
                                value={formData.username}
                                onChange={(e) => setFormData({...formData, username: e.target.value})}
                                placeholder="请输入用户名（例如：admin）"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            />
                            <p className="mt-1 text-xs text-gray-500">测试账号：admin / admin123456</p>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                密码
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({...formData, password: e.target.value})}
                                placeholder="请输入密码"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-3 px-4 rounded-lg text-white font-medium transition-colors ${
                                loading
                                    ? 'bg-blue-400 cursor-not-allowed'
                                    : 'bg-blue-500 hover:bg-blue-600'
                            }`}
                        >
                            {loading ? '登录中...' : '登录'}
                        </button>
                    </form>

                    {/* 第三方登录 */}
                    <div className="mt-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-gray-500">或使用以下方式登录</span>
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                            <button
                                onClick={() => handleWeixinLogin()}
                                className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-green-50 transition-colors"
                            >
                                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="#07C160">
                                    <path
                                        d="M8.5,13.5A1.5,1.5 0 1,0 7,15A1.5,1.5 0 0,0 8.5,13.5M14.5,13.5A1.5,1.5 0 1,0 13,15A1.5,1.5 0 0,0 14.5,13.5M12,2C6.48,2 2,6.03 2,11C2,13.66 3.44,16.07 5.79,17.69C5.5,18.5 5,20.5 5,20.5C5,20.5 7.5,19.5 9,19C10,19.33 11,19.5 12,19.5C17.52,19.5 22,15.47 22,10.5C22,5.53 17.52,2 12,2Z"/>
                                </svg>
                                <span className="text-sm font-medium text-gray-700">微信登录</span>
                            </button>
                            <button
                                onClick={() => handleAlipayLogin()}
                                className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-blue-50 transition-colors"
                            >
                                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="#1677FF">
                                    <path
                                        d="M12,2C6.48,2 2,6.48 2,12C2,17.52 6.48,22 12,22C17.52,22 22,17.52 22,12C22,6.48 17.52,2 12,2M17.5,14H14V17.5H10V14H6.5V10H10V6.5H14V10H17.5V14Z"/>
                                </svg>
                                <span className="text-sm font-medium text-gray-700">支付宝登录</span>
                            </button>
                        </div>
                    </div>

                    {/* 链接 */}
                    <div className="mt-6 text-center">
                        <div className="flex items-center justify-center space-x-4">
                            <Link
                                href="/register"
                                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                            >
                                立即注册
                            </Link>
                            <span className="text-gray-300">|</span>
                            <a
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    alert('请联系管理员重置密码');
                                }}
                                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                            >
                                忘记密码
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

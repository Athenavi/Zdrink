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

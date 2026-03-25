'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {useUserStore} from '@/stores/user';

export default function RegisterPage() {
    const router = useRouter();
    const register = useUserStore((state) => state.register);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        re_password: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // 验证密码
        if (formData.password !== formData.re_password) {
            setError('两次输入的密码不一致');
            setLoading(false);
            return;
        }

        try {
            await register({
                username: formData.username,
                email: formData.email,
                password: formData.password
            });

            // 注册成功，跳转到登录页
            router.push('/login?registered=true');
        } catch (err: any) {
            console.error('注册失败:', err);
            const errorMsg = err.response?.data?.username?.[0]
                || err.response?.data?.email?.[0]
                || err.response?.data?.password?.[0]
                || err.message
                || '注册失败，请重试';
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center p-4">
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

                {/* 注册表单 */}
                <div className="bg-white rounded-lg shadow-xl p-8">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
                        用户注册
                    </h2>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                            {error}
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
                                placeholder="请输入用户名"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                邮箱
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                                placeholder="请输入邮箱"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                required
                            />
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
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="re_password" className="block text-sm font-medium text-gray-700 mb-1">
                                确认密码
                            </label>
                            <input
                                id="re_password"
                                type="password"
                                value={formData.re_password}
                                onChange={(e) => setFormData({...formData, re_password: e.target.value})}
                                placeholder="请再次输入密码"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-3 px-4 rounded-lg text-white font-medium transition-colors ${
                                loading
                                    ? 'bg-green-400 cursor-not-allowed'
                                    : 'bg-green-500 hover:bg-green-600'
                            }`}
                        >
                            {loading ? '注册中...' : '注册'}
                        </button>
                    </form>

                    {/* 链接 */}
                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-600">
                            已有账号？{' '}
                            <Link
                                href="/login"
                                className="text-green-600 hover:text-green-700 font-medium"
                            >
                                立即登录
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

'use client';

import {Suspense, useState} from 'react';
import Link from 'next/link';
import apiClient from '@/lib/api';
import CaptchaButton, {useCaptcha} from '@/components/CaptchaButton';

const SHOP_TYPES = [
    {value: 'restaurant', label: '餐厅'},
    {value: 'cafe', label: '咖啡厅'},
    {value: 'bar', label: '酒吧'},
    {value: 'bakery', label: '烘焙店'},
    {value: 'other', label: '其他'},
];

export default function MerchantRegisterPage() {
    return (
        <Suspense fallback={<div
            className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <div className="text-white text-xl">加载中...</div>
        </div>}>
            <MerchantRegisterContent/>
        </Suspense>
    );
}

function MerchantRegisterContent() {
    const [form, setForm] = useState({
        contact_name: '',
        contact_phone: '',
        contact_email: '',
        shop_name: '',
        shop_type: 'restaurant',
        shop_address: '',
        shop_description: '',
        account_password: '',
        confirm_password: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const captcha = useCaptcha();

    const handleChange = (field: string) => (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        setForm(prev => ({...prev, [field]: e.target.value}));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // 启用了人机验证但尚未验证 → 自动触发
        if (captcha.result?.provider !== 'none' && !captcha.isVerified) {
            const ok = await captcha.execute();
            if (!ok) {
                setError('请先完成人机验证');
                return;
            }
        }

        setLoading(true);
        setError('');
        setSuccess(false);

        try {
            const body: Record<string, any> = {...form};
            if (captcha.result && captcha.result.provider !== 'none') {
                body.captcha_provider = captcha.result.provider;
                if (captcha.result.lot_number) body.lot_number = captcha.result.lot_number;
                if (captcha.result.captcha_output) body.captcha_output = captcha.result.captcha_output;
                if (captcha.result.pass_token) body.pass_token = captcha.result.pass_token;
                if (captcha.result.gen_time) body.gen_time = captcha.result.gen_time;
            }
            await apiClient.post('/shops/apply/', body);
            setSuccess(true);
        } catch (err: any) {
            const data = err.response?.data;
            if (typeof data === 'object' && data !== null) {
                const msgs = Object.values(data).flat().join('；');
                setError(msgs || '提交失败，请重试');
            } else {
                setError(data || '提交失败，请重试');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center p-4">
            <div className="w-full max-w-lg">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white">商家入驻</h1>
                    <p className="text-blue-100 mt-2">填写以下信息提交入驻申请</p>
                </div>

                <div className="bg-white rounded-lg shadow-xl p-8">
                    {success ? (
                        <div className="text-center py-8">
                            <div className="text-green-500 text-5xl mb-4">✓</div>
                            <h2 className="text-xl font-semibold text-gray-800 mb-2">申请已提交</h2>
                            <p className="text-gray-500 mb-6">我们将在审核后通过您留下的联系方式通知您</p>
                            <Link
                                href="/login"
                                className="inline-block px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                            >
                                返回登录
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}

                            <h3 className="font-medium text-gray-800 border-b pb-2">联系人信息</h3>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">联系人 *</label>
                                <input
                                    type="text" required
                                    value={form.contact_name}
                                    onChange={handleChange('contact_name')}
                                    placeholder="请输入联系人姓名"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">手机号 *</label>
                                    <input
                                        type="tel" required
                                        value={form.contact_phone}
                                        onChange={handleChange('contact_phone')}
                                        placeholder="11 位手机号"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">邮箱 *</label>
                                    <input
                                        type="email" required
                                        value={form.contact_email}
                                        onChange={handleChange('contact_email')}
                                        placeholder="联系邮箱"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <h3 className="font-medium text-gray-800 border-b pb-2 mt-2">店铺信息</h3>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">店铺名称 *</label>
                                <input
                                    type="text" required
                                    value={form.shop_name}
                                    onChange={handleChange('shop_name')}
                                    placeholder="请输入店铺名称"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">店铺类型 *</label>
                                <select
                                    value={form.shop_type}
                                    onChange={handleChange('shop_type')}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    {SHOP_TYPES.map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">店铺地址</label>
                                <input
                                    type="text"
                                    value={form.shop_address}
                                    onChange={handleChange('shop_address')}
                                    placeholder="店铺详细地址"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">店铺描述</label>
                                <textarea
                                    rows={3}
                                    value={form.shop_description}
                                    onChange={handleChange('shop_description')}
                                    placeholder="简单描述您的店铺和经营范围"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <h3 className="font-medium text-gray-800 border-b pb-2 mt-2">登录凭证</h3>
                            <p className="text-xs text-gray-500">审核通过后，使用此密码登录管理后台</p>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">设置密码 *</label>
                                    <input
                                        type="password" required minLength={6}
                                        value={form.account_password}
                                        onChange={handleChange('account_password')}
                                        placeholder="至少 6 位"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">确认密码 *</label>
                                    <input
                                        type="password" required minLength={6}
                                        value={form.confirm_password}
                                        onChange={handleChange('confirm_password')}
                                        placeholder="再次输入密码"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            {/* 人机验证 */}
                            <CaptchaButton captcha={captcha}/>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors"
                            >
                                {loading ? '提交中...' : '提交入驻申请'}
                            </button>

                            <p className="text-center text-sm text-gray-500">
                                已有账号？
                                <Link href="/login" className="text-blue-600 hover:text-blue-700 ml-1">去登录</Link>
                            </p>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

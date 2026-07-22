'use client';

import {Suspense, useState} from 'react';
import Link from 'next/link';
import {Check, ChevronLeft, ChevronRight, Lock, Store, User} from 'lucide-react';
import apiClient from '@/lib/api';
import CaptchaButton, {useCaptcha} from '@/components/CaptchaButton';

const SHOP_TYPES = [
    {value: 'restaurant', label: '餐厅'},
    {value: 'cafe', label: '咖啡厅'},
    {value: 'bar', label: '酒吧'},
    {value: 'bakery', label: '烘焙店'},
    {value: 'other', label: '其他'},
];

const STEPS = [
    {title: '联系人信息', icon: User, description: '填写您的联系方式'},
    {title: '店铺信息', icon: Store, description: '填写店铺基本信息'},
    {title: '登录凭证', icon: Lock, description: '设置管理后台密码'},
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
    const [step, setStep] = useState(0);
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

    // 每步校验
    const validateStep = (): string | null => {
        switch (step) {
            case 0:
                if (!form.contact_name.trim()) return '请输入联系人姓名';
                if (!/^1\d{10}$/.test(form.contact_phone)) return '请输入正确的11位手机号';
                if (!form.contact_email.trim()) return '请输入联系邮箱';
                return null;
            case 1:
                if (!form.shop_name.trim()) return '请输入店铺名称';
                return null;
            case 2:
                if (!form.account_password || form.account_password.length < 6) return '密码至少6位';
                if (form.account_password !== form.confirm_password) return '两次输入的密码不一致';
                return null;
            default:
                return null;
        }
    };

    const handleNext = () => {
        const err = validateStep();
        if (err) {
            setError(err);
            return;
        }
        setError('');
        setStep(s => Math.min(s + 1, 2));
    };

    const handlePrev = () => {
        setError('');
        setStep(s => Math.max(s - 1, 0));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const err = validateStep();
        if (err) {
            setError(err);
            return;
        }

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
                    <p className="text-blue-100 mt-2">三步完成入驻申请</p>
                </div>

                <div className="bg-white rounded-lg shadow-xl p-8">
                    {success ? (
                        <div className="text-center py-8">
                            <div
                                className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check className="w-8 h-8 text-green-500"/>
                            </div>
                            <h2 className="text-xl font-semibold text-gray-800 mb-2">申请已提交</h2>
                            <p className="text-gray-500 mb-1">我们将在审核后通过您留下的联系方式通知您</p>
                            <p className="text-sm text-gray-400 mb-6">
                                审核通过后，您可以使用申请时设置的密码通过一次性链接配置店铺
                            </p>
                            <div className="flex flex-col gap-3 items-center">
                                <Link
                                    href="/register/merchant/status"
                                    className="inline-block px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                                >
                                    查看申请状态
                                </Link>
                                <Link
                                    href="/login"
                                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                                >
                                    返回登录
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            {/* 步骤指示器 */}
                            <div className="flex items-center justify-center mb-8">
                                {STEPS.map((s, i) => (
                                    <div key={i} className="flex items-center">
                                        <div className="flex flex-col items-center">
                                            <div
                                                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                                                    i === step
                                                        ? 'bg-blue-500 text-white'
                                                        : i < step
                                                            ? 'bg-green-500 text-white'
                                                            : 'bg-gray-200 text-gray-500'
                                                }`}>
                                                {i < step ? (
                                                    <Check className="w-4 h-4"/>
                                                ) : (
                                                    <s.icon className="w-4 h-4"/>
                                                )}
                                            </div>
                                            <span className={`text-xs mt-1.5 whitespace-nowrap ${
                                                i === step ? 'text-blue-600 font-medium' : 'text-gray-400'
                                            }`}>
                                                {s.title}
                                            </span>
                                        </div>
                                        {i < STEPS.length - 1 && (
                                            <div className={`w-12 h-0.5 mx-2 mt-[-1.2rem] transition-colors ${
                                                i < step ? 'bg-green-500' : 'bg-gray-200'
                                            }`}/>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* 错误提示 */}
                            {error && (
                                <div
                                    className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm mb-4">
                                    {error}
                                </div>
                            )}

                            {/* 第 1 步：联系人信息 */}
                            {step === 0 && (
                                <div className="space-y-4 animate-fade-in">
                                    <p className="text-sm text-gray-500 mb-4">{STEPS[0].description}</p>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">联系人 *</label>
                                        <input
                                            type="text" required
                                            value={form.contact_name}
                                            onChange={handleChange('contact_name')}
                                            placeholder="请输入联系人姓名"
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">手机号
                                                *</label>
                                            <input
                                                type="tel" required
                                                value={form.contact_phone}
                                                onChange={handleChange('contact_phone')}
                                                placeholder="11 位手机号"
                                                maxLength={11}
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">邮箱
                                                *</label>
                                            <input
                                                type="email" required
                                                value={form.contact_email}
                                                onChange={handleChange('contact_email')}
                                                placeholder="联系邮箱"
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 第 2 步：店铺信息 */}
                            {step === 1 && (
                                <div className="space-y-4 animate-fade-in">
                                    <p className="text-sm text-gray-500 mb-4">{STEPS[1].description}</p>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">店铺名称
                                            *</label>
                                        <input
                                            type="text" required
                                            value={form.shop_name}
                                            onChange={handleChange('shop_name')}
                                            placeholder="请输入店铺名称"
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">店铺类型
                                            *</label>
                                        <select
                                            value={form.shop_type}
                                            onChange={handleChange('shop_type')}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
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
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">店铺描述</label>
                                        <textarea
                                            rows={3}
                                            value={form.shop_description}
                                            onChange={handleChange('shop_description')}
                                            placeholder="简单描述您的店铺和经营范围"
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* 第 3 步：登录凭证 */}
                            {step === 2 && (
                                <div className="space-y-4 animate-fade-in">
                                    <p className="text-sm text-gray-500 mb-4">{STEPS[2].description}</p>

                                    <div
                                        className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                                        审核通过后，使用此密码登录管理后台。密码加密存储，请妥善保管。
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">设置密码
                                                *</label>
                                            <input
                                                type="password" required minLength={6}
                                                value={form.account_password}
                                                onChange={handleChange('account_password')}
                                                placeholder="至少 6 位"
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">确认密码
                                                *</label>
                                            <input
                                                type="password" required minLength={6}
                                                value={form.confirm_password}
                                                onChange={handleChange('confirm_password')}
                                                placeholder="再次输入密码"
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    {/* 人机验证 */}
                                    <div className="pt-2">
                                        <CaptchaButton captcha={captcha}/>
                                    </div>
                                </div>
                            )}

                            {/* 导航按钮 */}
                            <div className="flex items-center justify-between mt-8 pt-4 border-t border-gray-100">
                                {step > 0 ? (
                                    <button
                                        type="button"
                                        onClick={handlePrev}
                                        disabled={loading}
                                        className="flex items-center gap-1 px-4 py-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
                                    >
                                        <ChevronLeft className="w-4 h-4"/>
                                        上一步
                                    </button>
                                ) : (
                                    <div/>
                                )}

                                {step < STEPS.length - 1 ? (
                                    <button
                                        type="button"
                                        onClick={handleNext}
                                        className="flex items-center gap-1 px-6 py-2.5 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                                    >
                                        下一步
                                        <ChevronRight className="w-4 h-4"/>
                                    </button>
                                ) : (
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex items-center gap-1 px-6 py-2.5 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors"
                                    >
                                        {loading ? '提交中...' : '提交入驻申请'}
                                    </button>
                                )}
                            </div>
                        </form>
                    )}

                    {/* 底部登录链接（非成功状态） */}
                    {!success && (
                        <p className="text-center text-sm text-gray-500 mt-4">
                            已有账号？
                            <Link href="/login" className="text-blue-600 hover:text-blue-700 ml-1">去登录</Link>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

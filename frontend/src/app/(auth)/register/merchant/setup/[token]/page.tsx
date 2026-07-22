'use client';

import {useCallback, useEffect, useState} from 'react';
import {useParams, useRouter} from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api';
import {AlertCircle, CheckCircle, Clock, Loader2, Lock, MapPin, Phone, Store, Truck} from 'lucide-react';

interface ApplyInfo {
    id: number;
    contact_name: string;
    contact_phone: string;
    contact_email: string;
    shop_name: string;
    shop_type: string;
    shop_address: string;
    shop_description: string;
    status: string;
    status_display: string;
    setup_completed: boolean;
    created_at: string;
    reviewed_at: string | null;
}

interface SetupForm {
    shop_name: string;
    shop_description: string;
    shop_address: string;
    phone: string;
    opening_hours: {
        weekday_start: string;
        weekday_end: string;
        weekend_start: string;
        weekend_end: string;
    };
    allow_delivery: boolean;
    allow_pickup: boolean;
    allow_dine_in: boolean;
    delivery_fee: string;
    minimum_order_amount: string;
    delivery_radius: string;
    latitude: string;
    longitude: string;
}

const SHOP_TYPES_LABEL: Record<string, string> = {
    restaurant: '餐厅',
    cafe: '咖啡厅',
    bar: '酒吧',
    bakery: '烘焙店',
    other: '其他',
};

type PagePhase = 'loading' | 'verify-password' | 'setup-form' | 'success' | 'error';

export default function MerchantSetupPage() {
    const params = useParams();
    const router = useRouter();
    const token = params.token as string;

    const [phase, setPhase] = useState<PagePhase>('loading');
    const [applyInfo, setApplyInfo] = useState<ApplyInfo | null>(null);
    const [password, setPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [saving, setSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const [form, setForm] = useState<SetupForm>({
        shop_name: '',
        shop_description: '',
        shop_address: '',
        phone: '',
        opening_hours: {weekday_start: '09:00', weekday_end: '21:00', weekend_start: '10:00', weekend_end: '22:00'},
        allow_delivery: true,
        allow_pickup: true,
        allow_dine_in: true,
        delivery_fee: '0',
        minimum_order_amount: '0',
        delivery_radius: '5',
        latitude: '',
        longitude: '',
    });

    // 验证令牌并获取申请信息
    useEffect(() => {
        if (!token) return;

        apiClient.get(`/shops/apply/setup/${token}/`)
            .then(res => {
                const data = res.data as ApplyInfo;
                setApplyInfo(data);
                // 预填表单
                setForm(prev => ({
                    ...prev,
                    shop_name: data.shop_name || '',
                    shop_description: data.shop_description || '',
                    shop_address: data.shop_address || '',
                }));
                setPhase('verify-password');
            })
            .catch(err => {
                const status = err.response?.status;
                const msg = err.response?.data?.error || '链接无效或已过期';
                if (status === 410) {
                    setErrorMessage('该设置链接已使用，请直接登录管理后台');
                } else {
                    setErrorMessage(msg);
                }
                setPhase('error');
            });
    }, [token]);

    const handleVerifyPassword = useCallback(async () => {
        if (!password || password.length < 6) {
            setPasswordError('密码至少 6 位');
            return;
        }

        setPasswordError('');
        setSaving(true);

        try {
            // 先验证密码（发送空数据，只验证身份）
            await apiClient.post(`/shops/apply/setup/${token}/`, {password});
            setPhase('setup-form');
        } catch (err: any) {
            const msg = err.response?.data?.error || '密码验证失败';
            setPasswordError(msg);
        } finally {
            setSaving(false);
        }
    }, [password, token]);

    const handleSubmitSetup = useCallback(async () => {
        setSaving(true);
        try {
            const body: Record<string, any> = {
                password,
                shop_name: form.shop_name,
                shop_description: form.shop_description,
                shop_address: form.shop_address,
                phone: form.phone,
                opening_hours: {
                    weekday_start: form.opening_hours.weekday_start,
                    weekday_end: form.opening_hours.weekday_end,
                    weekend_start: form.opening_hours.weekend_start,
                    weekend_end: form.opening_hours.weekend_end,
                },
                allow_delivery: form.allow_delivery,
                allow_pickup: form.allow_pickup,
                allow_dine_in: form.allow_dine_in,
                delivery_fee: form.delivery_fee,
                minimum_order_amount: form.minimum_order_amount,
                delivery_radius: parseInt(form.delivery_radius) || 5,
            };

            if (form.latitude) body.latitude = parseFloat(form.latitude);
            if (form.longitude) body.longitude = parseFloat(form.longitude);

            await apiClient.post(`/shops/apply/setup/${token}/`, body);
            setPhase('success');
        } catch (err: any) {
            const data = err.response?.data;
            if (typeof data === 'object' && data !== null) {
                const msgs = Object.values(data).flat().join('；');
                setErrorMessage(msgs || '保存配置失败');
            } else {
                setErrorMessage(data?.error || '保存配置失败');
            }
        } finally {
            setSaving(false);
        }
    }, [token, password, form]);

    const updateForm = (field: keyof SetupForm, value: any) => {
        setForm(prev => ({...prev, [field]: value}));
    };

    const updateOpeningHours = (field: string, value: string) => {
        setForm(prev => ({
            ...prev,
            opening_hours: {...prev.opening_hours, [field]: value},
        }));
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white">商户入驻设置</h1>
                    <p className="text-blue-100 mt-2">完成基本配置即可开始营业</p>
                </div>

                <div className="bg-white rounded-lg shadow-xl p-8">
                    {/* 加载中 */}
                    {phase === 'loading' && (
                        <div className="flex flex-col items-center py-12">
                            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4"/>
                            <p className="text-gray-500">验证链接中...</p>
                        </div>
                    )}

                    {/* 错误页面 */}
                    {phase === 'error' && (
                        <div className="text-center py-8">
                            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4"/>
                            <h2 className="text-xl font-semibold text-gray-800 mb-2">链接无效</h2>
                            <p className="text-gray-500 mb-6">{errorMessage}</p>
                            <Link
                                href="/login"
                                className="inline-block px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                            >
                                去登录
                            </Link>
                        </div>
                    )}

                    {/* 密码验证 */}
                    {phase === 'verify-password' && applyInfo && (
                        <div>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <Store className="w-5 h-5 text-blue-600"/>
                                    <span className="font-medium text-blue-800">{applyInfo.shop_name}</span>
                                    <span className="text-xs bg-blue-200 text-blue-700 px-2 py-0.5 rounded">
                                        {SHOP_TYPES_LABEL[applyInfo.shop_type] || applyInfo.shop_type}
                                    </span>
                                </div>
                                <p className="text-sm text-blue-600">
                                    申请人：{applyInfo.contact_name}（{applyInfo.contact_phone}）
                                </p>
                            </div>

                            <div className="text-center mb-6">
                                <Lock className="w-12 h-12 text-gray-400 mx-auto mb-3"/>
                                <h2 className="text-lg font-semibold text-gray-800 mb-1">请输入访问密码</h2>
                                <p className="text-sm text-gray-500">使用申请入驻时设置的密码</p>
                            </div>

                            {passwordError && (
                                <div
                                    className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm mb-4">
                                    {passwordError}
                                </div>
                            )}

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleVerifyPassword()}
                                    placeholder="请输入入驻申请时设置的密码"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg"
                                    autoFocus
                                />
                            </div>

                            <button
                                onClick={handleVerifyPassword}
                                disabled={saving || !password}
                                className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                            >
                                {saving ? (
                                    <><Loader2 className="w-5 h-5 animate-spin"/> 验证中...</>
                                ) : (
                                    <><Lock className="w-5 h-5"/> 验证并进入设置</>
                                )}
                            </button>
                        </div>
                    )}

                    {/* 店铺配置表单 */}
                    {phase === 'setup-form' && (
                        <div className="space-y-6">
                            <div
                                className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 flex-shrink-0"/>
                                密码验证通过，请完善店铺基本配置
                            </div>

                            {errorMessage && (
                                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                                    {errorMessage}
                                </div>
                            )}

                            {/* 基本信息 */}
                            <h3 className="font-medium text-gray-800 border-b pb-2 flex items-center gap-2">
                                <Store className="w-4 h-4"/> 基本信息
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">店铺名称</label>
                                    <input
                                        type="text"
                                        value={form.shop_name}
                                        onChange={e => updateForm('shop_name', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">联系电话</label>
                                    <div className="relative">
                                        <Phone
                                            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
                                        <input
                                            type="tel"
                                            value={form.phone}
                                            onChange={e => updateForm('phone', e.target.value)}
                                            placeholder="店铺对外电话"
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">店铺描述</label>
                                <textarea
                                    rows={2}
                                    value={form.shop_description}
                                    onChange={e => updateForm('shop_description', e.target.value)}
                                    placeholder="简单介绍您的店铺和特色"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">店铺地址</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
                                    <input
                                        type="text"
                                        value={form.shop_address}
                                        onChange={e => updateForm('shop_address', e.target.value)}
                                        placeholder="店铺详细地址"
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            {/* 营业时间 */}
                            <h3 className="font-medium text-gray-800 border-b pb-2 flex items-center gap-2">
                                <Clock className="w-4 h-4"/> 营业时间
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">工作日</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="time"
                                            value={form.opening_hours.weekday_start}
                                            onChange={e => updateOpeningHours('weekday_start', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                        <span className="text-gray-400">至</span>
                                        <input
                                            type="time"
                                            value={form.opening_hours.weekday_end}
                                            onChange={e => updateOpeningHours('weekday_end', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">周末</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="time"
                                            value={form.opening_hours.weekend_start}
                                            onChange={e => updateOpeningHours('weekend_start', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                        <span className="text-gray-400">至</span>
                                        <input
                                            type="time"
                                            value={form.opening_hours.weekend_end}
                                            onChange={e => updateOpeningHours('weekend_end', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 服务类型 */}
                            <h3 className="font-medium text-gray-800 border-b pb-2 flex items-center gap-2">
                                <Truck className="w-4 h-4"/> 服务与配送
                            </h3>

                            <div className="flex flex-wrap gap-4">
                                {[
                                    {key: 'allow_delivery' as const, label: '外卖配送'},
                                    {key: 'allow_pickup' as const, label: '到店自取'},
                                    {key: 'allow_dine_in' as const, label: '堂食'},
                                ].map(item => (
                                    <label key={item.key}
                                           className="flex items-center gap-2 cursor-pointer bg-gray-50 px-4 py-2.5 rounded-lg border hover:border-blue-300 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={form[item.key]}
                                            onChange={e => updateForm(item.key, e.target.checked)}
                                            className="w-4 h-4 text-blue-600 rounded"
                                        />
                                        <span className="text-sm text-gray-700">{item.label}</span>
                                    </label>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">配送费（元）</label>
                                    <input
                                        type="number" min="0" step="0.01"
                                        value={form.delivery_fee}
                                        onChange={e => updateForm('delivery_fee', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label
                                        className="block text-sm font-medium text-gray-700 mb-1">最低起送价（元）</label>
                                    <input
                                        type="number" min="0" step="0.01"
                                        value={form.minimum_order_amount}
                                        onChange={e => updateForm('minimum_order_amount', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label
                                        className="block text-sm font-medium text-gray-700 mb-1">配送半径（公里）</label>
                                    <input
                                        type="number" min="1"
                                        value={form.delivery_radius}
                                        onChange={e => updateForm('delivery_radius', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            {/* 地理位置 */}
                            <h3 className="font-medium text-gray-800 border-b pb-2 flex items-center gap-2">
                                <MapPin className="w-4 h-4"/> 地理位置（选填）
                            </h3>
                            <p className="text-xs text-gray-500 -mt-3">
                                填写经纬度可在地图上精确定位您的店铺，方便顾客查找
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">纬度</label>
                                    <input
                                        type="text" placeholder="例如 39.9042"
                                        value={form.latitude}
                                        onChange={e => updateForm('latitude', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">经度</label>
                                    <input
                                        type="text" placeholder="例如 116.4074"
                                        value={form.longitude}
                                        onChange={e => updateForm('longitude', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            {/* 提交按钮 */}
                            <button
                                onClick={handleSubmitSetup}
                                disabled={saving}
                                className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                            >
                                {saving ? (
                                    <><Loader2 className="w-5 h-5 animate-spin"/> 保存中...</>
                                ) : (
                                    <><CheckCircle className="w-5 h-5"/> 保存配置并完成入驻</>
                                )}
                            </button>
                        </div>
                    )}

                    {/* 成功页面 */}
                    {phase === 'success' && (
                        <div className="text-center py-8">
                            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4"/>
                            <h2 className="text-xl font-semibold text-gray-800 mb-2">设置完成！</h2>
                            <p className="text-gray-500 mb-2">您的店铺基本配置已保存成功</p>
                            <p className="text-sm text-gray-400 mb-6">
                                现在可以使用申请时填写的手机号和密码登录管理后台
                            </p>
                            <Link
                                href="/login"
                                className="inline-block px-8 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                            >
                                去登录管理后台
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

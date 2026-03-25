'use client';

import {useEffect, useState, Suspense} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import {Home, MapPin, Phone, Tag, User} from 'lucide-react';
import AppHeader from '@/components/AppHeader';

interface AddressFormData {
    name: string;
    phone: string;
    province: string;
    city: string;
    district: string;
    detail: string;
    label: string;
    is_default: boolean;
}

export default function AddressEditPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">加载中...</div>}>
            <AddressEditContent/>
        </Suspense>
    );
}

function AddressEditContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const addressId = searchParams.get('id');
    const isEdit = !!addressId;

    const [formData, setFormData] = useState<AddressFormData>({
        name: '',
        phone: '',
        province: '',
        city: '',
        district: '',
        detail: '',
        label: '',
        is_default: false
    });
    const [showRegionPicker, setShowRegionPicker] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // 加载地址详情（编辑模式）
    useEffect(() => {
        if (isEdit) {
            loadAddress();
        }
    }, [isEdit]);

    const loadAddress = async () => {
        try {
            // TODO: 从 API 加载地址详情
            // 模拟数据
            const mockData = {
                id: addressId,
                name: '张三',
                phone: '138****1234',
                province: '北京市',
                city: '市辖区',
                district: '朝阳区',
                detail: 'xxx 街道 xxx 号',
                label: '家',
                is_default: true
            };

            setFormData({
                name: mockData.name,
                phone: mockData.phone,
                province: mockData.province,
                city: mockData.city,
                district: mockData.district,
                detail: mockData.detail,
                label: mockData.label || '',
                is_default: mockData.is_default
            });
        } catch (error) {
            console.error('加载地址详情失败:', error);
        }
    };

    const validateForm = () => {
        if (!formData.name || !formData.name.trim()) {
            alert('请输入收货人姓名');
            return false;
        }

        if (!formData.phone || !formData.phone.trim()) {
            alert('请输入手机号码');
            return false;
        }

        if (!/^\d{11}$/.test(formData.phone)) {
            alert('请输入正确的手机号码（11 位数字）');
            return false;
        }

        if (!formData.province || !formData.city || !formData.district) {
            alert('请选择所在地区');
            return false;
        }

        if (!formData.detail || !formData.detail.trim()) {
            alert('请输入详细地址');
            return false;
        }

        return true;
    };

    const submitForm = async () => {
        if (!validateForm()) return;

        setSubmitting(true);
        try {
            // TODO: 调用 API 保存或更新地址
            console.log('提交地址:', formData);

            alert(isEdit ? '修改成功' : '添加成功');
            setTimeout(() => {
                router.back();
            }, 1000);
        } catch (error) {
            alert('操作失败，请稍后重试');
        } finally {
            setSubmitting(false);
        }
    };

    const regionText = `${formData.province}${formData.city}${formData.district}`;

    return (
        <div className="min-h-screen bg-gray-50">
            <AppHeader title={isEdit ? '编辑地址' : '新建地址'}/>

            <div className="p-3 space-y-3 mt-3">
                {/* 收货人 */}
                <div className="bg-white rounded-xl p-4">
                    <label className="text-sm text-gray-600 mb-2 block">收货人</label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            placeholder="请输入收货人姓名"
                            maxLength={20}
                            className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                        />
                    </div>
                </div>

                {/* 手机号 */}
                <div className="bg-white rounded-xl p-4">
                    <label className="text-sm text-gray-600 mb-2 block">手机号</label>
                    <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                            placeholder="请输入手机号码"
                            maxLength={11}
                            className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                        />
                    </div>
                </div>

                {/* 地区选择 */}
                <div className="bg-white rounded-xl p-4">
                    <label className="text-sm text-gray-600 mb-2 block">地区</label>
                    <button
                        type="button"
                        onClick={() => setShowRegionPicker(true)}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-left flex items-center justify-between focus:outline-none focus:border-blue-500"
                    >
                        <div className="flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-gray-400"/>
                            <span className={regionText ? 'text-gray-900' : 'text-gray-400'}>
                {regionText || '请选择省/市/区'}
              </span>
                        </div>
                        <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                             strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6"/>
                        </svg>
                    </button>
                </div>

                {/* 详细地址 */}
                <div className="bg-white rounded-xl p-4">
                    <label className="text-sm text-gray-600 mb-2 block">详细地址</label>
                    <textarea
                        value={formData.detail}
                        onChange={(e) => setFormData({...formData, detail: e.target.value})}
                        placeholder="请输入街道、楼栋号等详细信息"
                        maxLength={100}
                        rows={3}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 resize-none"
                    />
                    <div className="text-xs text-gray-400 text-right mt-1">
                        {formData.detail.length}/100
                    </div>
                </div>

                {/* 地址标签 */}
                <div className="bg-white rounded-xl p-4">
                    <label className="text-sm text-gray-600 mb-2 block">地址标签</label>
                    <div className="relative">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/>
                        <input
                            type="text"
                            value={formData.label}
                            onChange={(e) => setFormData({...formData, label: e.target.value})}
                            placeholder="如：家、公司、学校等"
                            className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                        />
                    </div>
                </div>

                {/* 设为默认地址 */}
                <div className="bg-white rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Home className="w-5 h-5 text-gray-400"/>
                        <span className="text-sm font-medium">设为默认地址</span>
                    </div>
                    <button
                        onClick={() => setFormData({...formData, is_default: !formData.is_default})}
                        className={`w-12 h-6 rounded-full transition-colors ${
                            formData.is_default ? 'bg-blue-500' : 'bg-gray-300'
                        }`}
                    >
                        <div
                            className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                                formData.is_default ? 'translate-x-6' : 'translate-x-0.5'
                            }`}
                        />
                    </button>
                </div>
            </div>

            {/* 提交按钮 */}
            <div className="p-3 mt-6">
                <button
                    onClick={submitForm}
                    disabled={submitting}
                    className="w-full py-3.5 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                    {submitting ? '保存中...' : '保存地址'}
                </button>
            </div>

            {/* 地区选择器弹窗（简化版本） */}
            {showRegionPicker && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
                    <div className="bg-white w-full rounded-t-2xl max-h-[70vh] overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-gray-200">
                            <button
                                onClick={() => setShowRegionPicker(false)}
                                className="px-4 py-2 text-gray-600 hover:text-gray-900"
                            >
                                取消
                            </button>
                            <span className="font-medium">选择地区</span>
                            <button
                                onClick={() => {
                                    // TODO: 实现地区选择确认逻辑
                                    setShowRegionPicker(false);
                                }}
                                className="px-4 py-2 text-blue-500 hover:text-blue-600 font-medium"
                            >
                                确定
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto max-h-[calc(70vh-60px)]">
                            <div className="text-center text-gray-500 py-8">
                                地区选择功能开发中...
                                <br/>
                                <span className="text-sm">请使用浏览器原生选择器替代</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

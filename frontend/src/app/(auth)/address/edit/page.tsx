'use client';

import {Suspense, useEffect, useState} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import {Home, MapPin, Phone, Tag, User} from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import RegionPicker from '@/components/RegionPicker';
import {addressApi} from '@/lib/api/address';
import Loading from '@/components/Loading';

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
    const [loading, setLoading] = useState(false);

    // 加载地址详情（编辑模式）
    useEffect(() => {
        if (isEdit) {
            loadAddress();
        }
    }, [isEdit]);

    const loadAddress = async () => {
        if (!addressId) return;

        setLoading(true);
        try {
            const response = await addressApi.getAddress(Number(addressId));
            const address = response.data;
            
            setFormData({
                name: address.name,
                phone: address.phone,
                province: address.province,
                city: address.city,
                district: address.district,
                detail: address.detail,
                label: address.label || '',
                is_default: address.is_default
            });
        } catch (error) {
            console.error('加载地址详情失败:', error);
            alert('加载地址失败');
        } finally {
            setLoading(false);
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
            const addressData = {
                name: formData.name.trim(),
                phone: formData.phone.trim(),
                province: formData.province,
                city: formData.city,
                district: formData.district,
                detail: formData.detail.trim(),
                label: formData.label.trim(),
                is_default: formData.is_default
            };

            if (isEdit && addressId) {
                await addressApi.updateAddress(Number(addressId), addressData);
                alert('修改成功');
            } else {
                await addressApi.createAddress(addressData);
                alert('添加成功');
            }
            
            setTimeout(() => {
                router.back();
            }, 500);
        } catch (error) {
            console.error('保存地址失败:', error);
            alert('操作失败，请稍后重试');
        } finally {
            setSubmitting(false);
        }
    };

    const regionText = `${formData.province}${formData.city}${formData.district}`;

    return (
        <div className="min-h-screen bg-gray-50">
            <AppHeader title={isEdit ? '编辑地址' : '新建地址'}/>

            {loading ? (
                <Loading/>
            ) : (
                <>
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
                                <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none"
                                     stroke="currentColor"
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

                    {/* 地区选择器弹窗 */}
                    <RegionPicker
                        visible={showRegionPicker}
                        value={{
                            province: formData.province,
                            city: formData.city,
                            district: formData.district
                        }}
                        onChange={(region) => {
                            setFormData({
                                ...formData,
                                province: region.province,
                                city: region.city,
                                district: region.district
                            });
                        }}
                        onClose={() => setShowRegionPicker(false)}
                    />
                </>
            )}
        </div>
    );
}

'use client';

import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {Edit, MapPin, Phone, Plus, Trash2, User} from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import Loading from '@/components/Loading';
import {Address, addressApi} from '@/lib/api/address';

export default function AddressPage() {
    const router = useRouter();
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadAddresses();
    }, []);

    const loadAddresses = async () => {
        setLoading(true);
        try {
            const response = await addressApi.getAddresses();
            // 处理分页响应或直接数组
            const data = response.data;
            if (Array.isArray(data)) {
                setAddresses(data);
            } else if (data && Array.isArray(data.results)) {
                setAddresses(data.results);
            } else {
                setAddresses([]);
            }
        } catch (error) {
            console.error('加载地址失败:', error);
            setAddresses([]);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('确定要删除这个地址吗？')) {
            return;
        }

        try {
            await addressApi.deleteAddress(id);
            alert('删除成功');
            await loadAddresses();
        } catch (error) {
            console.error('删除地址失败:', error);
            alert('删除失败');
        }
    };

    const handleSetDefault = async (id: number) => {
        try {
            await addressApi.setDefaultAddress(id);
            alert('设置成功');
            await loadAddresses();
        } catch (error) {
            console.error('设置默认地址失败:', error);
            alert('设置失败');
        }
    };

    const handleEdit = (address: Address) => {
        router.push(`/address/edit?id=${address.id}`);
    };

    const handleAddNew = () => {
        router.push('/address/edit');
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <AppHeader title="收货地址"/>

            {loading ? (
                <Loading/>
            ) : addresses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <MapPin className="w-16 h-16 mb-3 opacity-30"/>
                    <p className="mb-4">暂无收货地址</p>
                    <button
                        onClick={handleAddNew}
                        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                        添加地址
                    </button>
                </div>
            ) : (
                <div className="space-y-3 p-3">
                    {addresses.map((address) => (
                        <div
                            key={address.id}
                            className={`bg-white rounded-lg p-4 shadow-sm ${
                                address.is_default ? 'border-2 border-blue-500' : ''
                            }`}
                        >
                            {/* 头部信息 */}
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-gray-500"/>
                                    <span className="font-medium text-gray-800">{address.name}</span>
                                    <span className="text-gray-400">|</span>
                                    <Phone className="w-4 h-4 text-gray-500"/>
                                    <span className="text-gray-600">{address.phone}</span>
                                </div>
                                {address.is_default && (
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded">
                                        默认
                                    </span>
                                )}
                            </div>

                            {/* 地址详情 */}
                            <div className="flex items-start gap-2 mb-3">
                                <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0"/>
                                <div className="flex-1">
                                    <div className="text-sm text-gray-700">
                                        {address.province}{address.city}{address.district}
                                    </div>
                                    <div className="text-sm text-gray-700 mt-1">
                                        {address.detail}
                                    </div>
                                </div>
                            </div>

                            {/* 标签 */}
                            {address.label && (
                                <div className="mb-3">
                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                                        {address.label}
                                    </span>
                                </div>
                            )}

                            {/* 操作按钮 */}
                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                                {!address.is_default && (
                                    <button
                                        onClick={() => handleSetDefault(address.id)}
                                        className="text-sm text-blue-500 hover:text-blue-600"
                                    >
                                        设为默认
                                    </button>
                                )}
                                <button
                                    onClick={() => handleEdit(address)}
                                    className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800"
                                >
                                    <Edit className="w-4 h-4"/>
                                    <span>编辑</span>
                                </button>
                                <button
                                    onClick={() => handleDelete(address.id)}
                                    className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600"
                                >
                                    <Trash2 className="w-4 h-4"/>
                                    <span>删除</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* 底部添加按钮 */}
            <div
                className="fixed bottom-0 left-0 right-0 p-3 bg-white border-t border-gray-200 safe-area-bottom md:hidden">
                <button
                    onClick={handleAddNew}
                    className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                >
                    <Plus className="w-5 h-5"/>
                    <span>添加新地址</span>
                </button>
            </div>

            {/* 桌面端浮动按钮 */}
            <button
                onClick={handleAddNew}
                className="hidden md:flex fixed bottom-8 right-8 w-14 h-14 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-colors items-center justify-center"
            >
                <Plus className="w-6 h-6"/>
            </button>
        </div>
    );
}

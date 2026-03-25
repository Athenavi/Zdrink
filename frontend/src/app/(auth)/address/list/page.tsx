'use client';

import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {Edit, MapPin, Phone, Plus, Trash2, User} from 'lucide-react';
import AppHeader from '@/components/AppHeader';

interface Address {
    id: number;
    name: string;
    phone: string;
    full_address: string;
    is_default: boolean;
}

export default function AddressListPage() {
    const router = useRouter();
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [loading, setLoading] = useState(false);

    // 加载地址列表
    useEffect(() => {
        loadAddresses();
    }, []);

    const loadAddresses = async () => {
        setLoading(true);
        try {
            // TODO: 从 API 加载地址列表
            // 模拟数据
            const mockAddresses: Address[] = [
                {
                    id: 1,
                    name: '张三',
                    phone: '138****1234',
                    full_address: '北京市朝阳区 xxx 街道 xxx 号',
                    is_default: true
                },
                {
                    id: 2,
                    name: '李四',
                    phone: '139****5678',
                    full_address: '上海市浦东新区 xxx 路 xxx 号',
                    is_default: false
                }
            ];
            setAddresses(mockAddresses);
        } catch (error) {
            console.error('加载地址列表失败:', error);
        } finally {
            setLoading(false);
        }
    };

    const selectAddress = (address: Address) => {
        // TODO: 设置为默认地址
        alert('已选择该地址');
    };

    const addAddress = () => {
        router.push('/address/edit');
    };

    const editAddress = (address: Address) => {
        router.push(`/address/edit?id=${address.id}`);
    };

    const deleteAddress = async (address: Address) => {
        if (!confirm('确定要删除该收货地址吗？')) {
            return;
        }

        try {
            // TODO: 调用 API 删除地址
            await loadAddresses();
            alert('删除成功');
        } catch (error) {
            console.error('删除失败:', error);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <AppHeader title="收货地址" showBack={true}/>

            {/* 地址列表 */}
            {addresses.length > 0 ? (
                <div className="p-3 space-y-3">
                    {addresses.map((address) => (
                        <div
                            key={address.id}
                            onClick={() => selectAddress(address)}
                            className={`bg-white rounded-xl p-4 transition-all ${
                                address.is_default ? 'ring-2 ring-blue-500' : ''
                            }`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="flex items-center gap-2">
                                            <User className="w-4 h-4 text-gray-400"/>
                                            <span className="font-semibold text-base">{address.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Phone className="w-4 h-4 text-gray-400"/>
                                            <span className="text-gray-600 text-sm">{address.phone}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-2 text-sm text-gray-600 mt-3">
                                        <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5"/>
                                        <span className="flex-1">{address.full_address}</span>
                                    </div>

                                    {address.is_default && (
                                        <div className="mt-3">
                      <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded text-xs font-medium">
                        默认
                      </span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={() => editAddress(address)}
                                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors flex items-center gap-1"
                                    >
                                        <Edit className="w-3 h-3"/>
                                        <span>编辑</span>
                                    </button>
                                    <button
                                        onClick={() => deleteAddress(address)}
                                        className="px-3 py-1.5 border border-red-300 text-red-500 rounded-lg text-sm hover:bg-red-50 transition-colors flex items-center gap-1"
                                    >
                                        <Trash2 className="w-3 h-3"/>
                                        <span>删除</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* 空状态 */
                <div className="flex flex-col items-center justify-center pt-32 px-4">
                    <div className="w-32 h-32 text-gray-300 mb-6">
                        <MapPin className="w-full h-full"/>
                    </div>
                    <p className="text-gray-500 text-lg mb-6">暂无收货地址</p>
                    <button
                        onClick={addAddress}
                        className="px-8 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                    >
                        添加地址
                    </button>
                </div>
            )}

            {/* 新建按钮 */}
            {addresses.length > 0 && (
                <div className="fixed bottom-4 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:max-w-md">
                    <button
                        onClick={addAddress}
                        className="w-full py-3.5 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 shadow-lg"
                    >
                        <Plus className="w-5 h-5"/>
                        <span>新建地址</span>
                    </button>
                </div>
            )}
        </div>
    );
}

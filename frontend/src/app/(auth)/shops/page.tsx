'use client';

import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import Image from 'next/image';
import {ChevronRight, MapPin, Search, Star} from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import Loading from '@/components/Loading';
import {shopApi} from '@/lib/api/shop';
import {getImageUrl} from '@/utils';
import {Shop} from '@/types';

interface ShopType {
    label: string;
    value: string;
}

export default function ShopsPage() {
    const router = useRouter();

    const [searchKeyword, setSearchKeyword] = useState('');
    const [selectedType, setSelectedType] = useState('');
    const [loading, setLoading] = useState(false);
    const [finished, setFinished] = useState(false);
    const [shops, setShops] = useState<Shop[]>([]);
    const [page, setPage] = useState(1);

    const shopTypes: ShopType[] = [
        {label: '全部', value: ''},
        {label: '餐厅', value: 'restaurant'},
        {label: '咖啡厅', value: 'cafe'},
        {label: '酒吧', value: 'bar'},
        {label: '烘焙店', value: 'bakery'},
        {label: '其他', value: 'other'}
    ];

    // 加载店铺列表
    const loadShops = async () => {
        if (loading) return;

        setLoading(true);
        try {
            const params: any = {
                is_active: true,
                page: page,
                page_size: 10
            };

            if (selectedType) {
                params.shop_type = selectedType;
            }

            if (searchKeyword) {
                params.search = searchKeyword;
            }

            const response = await shopApi.getShops(params);
            const newShops = (response.data as any).results || response.data;

            if (page === 1) {
                setShops(newShops);
            } else {
                setShops(prev => [...prev, ...newShops]);
            }

            setFinished(newShops.length < 10);
            setPage(prev => prev + 1);
        } catch (error) {
            console.error('加载店铺失败:', error);
        } finally {
            setLoading(false);
        }
    };

    // 初始化加载
    useEffect(() => {
        loadShops();
    }, []);

    // 无限滚动加载
    useEffect(() => {
        const handleScroll = () => {
            if (loading || finished) return;

            const scrollTop = window.innerHeight + document.documentElement.scrollTop;
            const threshold = document.documentElement.offsetHeight - 200;

            if (scrollTop >= threshold) {
                loadShops();
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [loading, finished, page, selectedType, searchKeyword]);

    const handleSearch = () => {
        setPage(1);
        setShops([]);
        setFinished(false);
        loadShops();
    };

    const selectType = (type: string) => {
        setSelectedType(type);
        setPage(1);
        setShops([]);
        setFinished(false);
    };

    const goToShop = (shopId: number) => {
        router.push(`/shop/${shopId}`);
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <AppHeader showBack={true} title="全部店铺"/>

            {/* 搜索和筛选 */}
            <div className="bg-white p-3">
                <div className="relative">
                    <input
                        type="text"
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="搜索店铺"
                        className="w-full px-4 py-2 pl-10 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        onClick={handleSearch}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-blue-500"
                    >
                        <Search className="w-5 h-5"/>
                    </button>
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                    {shopTypes.map((type) => (
                        <button
                            key={type.value}
                            onClick={() => selectType(type.value)}
                            className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
                                selectedType === type.value
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            {type.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* 店铺列表 */}
            <div className="p-3 space-y-3">
                {shops.map((shop) => (
                    <div
                        key={shop.id}
                        onClick={() => goToShop(shop.id)}
                        className="bg-white rounded-xl p-4 cursor-pointer hover:bg-gray-50 transition-colors relative"
                    >
                        <div className="flex gap-3">
                            <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 relative">
                                {shop.logo ? (
                                    <Image
                                        src={getImageUrl(shop.logo || '')}
                                        alt={shop.name}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div
                                        className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                        暂无图片
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-semibold text-base truncate">{shop.name}</h3>
                                    {shop.is_active && (
                                        <span className="px-2 py-0.5 bg-green-100 text-green-600 text-xs rounded">
                      营业中
                    </span>
                                    )}
                                </div>

                                <p className="text-sm text-gray-500 line-clamp-2 mb-2">{shop.description}</p>

                                <div className="flex items-center justify-between mb-2 text-xs text-gray-400">
                                    <div className="flex items-center gap-1">
                                        <MapPin className="w-3 h-3"/>
                                        <span>{shop.address || '未知地址'}</span>
                                    </div>
                                    {shop.rating && (
                                        <div className="flex items-center gap-1">
                                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400"/>
                                            <span className="text-yellow-600">{shop.rating}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    {shop.allow_delivery && (
                                        <span
                                            className="px-2 py-0.5 border border-blue-500 text-blue-500 text-xs rounded">
                      外卖
                    </span>
                                    )}
                                    {shop.allow_pickup && (
                                        <span
                                            className="px-2 py-0.5 border border-blue-500 text-blue-500 text-xs rounded">
                      自取
                    </span>
                                    )}
                                    {shop.allow_dine_in && (
                                        <span
                                            className="px-2 py-0.5 border border-blue-500 text-blue-500 text-xs rounded">
                      堂食
                    </span>
                                    )}
                                </div>
                            </div>

                            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/>
                        </div>
                    </div>
                ))}

                {/* 空状态 */}
                {!loading && shops.length === 0 && (
                    <div className="text-center py-12">
                        <Search className="w-16 h-16 mx-auto text-gray-300 mb-4"/>
                        <p className="text-gray-500">暂无店铺</p>
                    </div>
                )}

                {/* 加载提示 */}
                {loading && (
                    <div className="text-center py-4 text-gray-500">加载中...</div>
                )}

                {/* 结束提示 */}
                {finished && shops.length > 0 && (
                    <div className="text-center py-4 text-gray-400 text-sm">没有更多了</div>
                )}
            </div>

            <Loading loading={loading && shops.length === 0} text="加载中..."/>
        </div>
    );
}

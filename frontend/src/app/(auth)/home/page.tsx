'use client';

import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {Gift, Grid, HelpCircle, Home, MapPin, ShoppingCart, Ticket, User} from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import Loading from '@/components/Loading';
import {useUserStore} from '@/stores/user';
import {useCartStore} from '@/stores/cart';
import {shopApi} from '@/lib/api/shop';
import {getImageUrl} from '@/utils';
import {Shop} from '@/types';

// 功能入口图标映射
const featureIcons: Record<string, any> = {
    'shop-o': MapPin,
    'coupon-o': Ticket,
    'gift-o': Gift,
    'question-o': HelpCircle
};

export default function HomePage() {
    const router = useRouter();
    const userStore = useUserStore();
    const cartStore = useCartStore();

    const [activeTab, setActiveTab] = useState('home');
    const [searchKeyword, setSearchKeyword] = useState('');
    const [loading, setLoading] = useState(false);
    // 临时禁用轮播图，避免 404 错误
    // const [banners] = useState([
    //     {id: 1, image: '/images/banner1.jpg', link: '/promotion/1'},
    //     {id: 2, image: '/images/banner2.jpg', link: '/promotion/2'},
    //     {id: 3, image: '/images/banner3.jpg', link: '/promotion/3'}
    // ]);
    const [banners] = useState<any[]>([]);
    const [featuredShops, setFeaturedShops] = useState<Shop[]>([]);

    // 功能入口
    const features = [
        {id: 1, icon: 'shop-o', text: '附近店铺', path: '/shops'},
        {id: 2, icon: 'coupon-o', text: '优惠券', path: '/coupons'},
        {id: 3, icon: 'gift-o', text: '积分兑换', path: '/points'},
        {id: 4, icon: 'question-o', text: '使用帮助', path: '/help'}
    ];

    // 加载数据
    const loadData = async () => {
        setLoading(true);
        try {
            // 加载推荐店铺
            const shopResponse = await shopApi.getShops({is_active: true, limit: 6});
            setFeaturedShops((shopResponse.data.results || shopResponse.data) as Shop[]);
        } catch (error) {
            console.error('加载数据失败:', error);
        } finally {
            setLoading(false);
        }
    };

    // 加载购物车
    const loadCart = async () => {
        if (userStore.isLoggedIn) {
            try {
                await cartStore.getCart();
                console.log('购物车加载成功');
            } catch (error) {
                console.log('加载购物车失败:', error);
            }
        }
    };

    // 监听登录状态变化
    useEffect(() => {
        if (userStore.isLoggedIn) {
            loadCart();
        }
    }, [userStore.isLoggedIn]);

    // 初始化用户信息
    useEffect(() => {
        userStore.initUser();
    }, []);

    // 初始化加载
    useEffect(() => {
        loadData();
        loadCart();
    }, []);

    const handleSearch = () => {
        if (searchKeyword && searchKeyword.trim()) {
            router.push(`/search?q=${encodeURIComponent(searchKeyword)}`);
        }
    };

    const handleFeatureClick = (path: string) => {
        router.push(path);
    };

    const handleTabChange = (name: string) => {
        const routes: Record<string, string> = {
            home: '/home',
            category: '/categories',
            cart: '/cart',
            profile: '/profile'
        };
        if (routes[name]) {
            router.push(routes[name]);
        }
    };

    const goToShopList = () => {
        router.push('/shops');
    };

    const goToShop = (shopId: number) => {
        router.push(`/shop/${shopId}`);
    };

    const getShopTypeText = (type: string) => {
        const typeMap: Record<string, string> = {
            restaurant: '餐厅',
            cafe: '咖啡厅',
            bar: '酒吧',
            bakery: '烘焙店',
            other: '其他'
        };
        return typeMap[type] || '店铺';
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-16">
            <AppHeader title="Zdrink 点餐" showBack={false} showCart={true}/>

            {/* 搜索栏 */}
            <div className="p-3 bg-white">
                <div className="relative">
                    <input
                        type="text"
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="搜索店铺或商品"
                        className="w-full px-4 py-2 pl-10 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <svg
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                </div>
            </div>

            {/* 轮播图 */}
            {banners.length > 0 && (
                <div className="mx-3 mt-3 rounded-xl overflow-hidden">
                    <div className="relative h-32 w-full overflow-hidden">
                        {banners.map((banner, index) => (
                            <div
                                key={banner.id}
                                className={`absolute inset-0 transition-opacity duration-1000 ${
                                    index === 0 ? 'opacity-100' : 'opacity-0'
                                }`}
                            >
                                <img
                                    src={banner.image}
                                    alt={`Banner ${index + 1}`}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 功能入口 */}
            <div className="mx-3 mt-3 bg-white rounded-xl p-4">
                <div className="grid grid-cols-4 gap-4">
                    {features.map((feature) => {
                        const IconComponent = featureIcons[feature.icon] || MapPin;
                        return (
                            <button
                                key={feature.id}
                                onClick={() => handleFeatureClick(feature.path)}
                                className="flex flex-col items-center justify-center space-y-2 hover:bg-gray-50 rounded-lg transition-colors p-2"
                            >
                                <IconComponent className="w-8 h-8 text-blue-500"/>
                                <span className="text-sm text-gray-700">{feature.text}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 推荐店铺 */}
            <div className="mx-3 mt-3 bg-white rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold">推荐店铺</h2>
                    <button
                        onClick={goToShopList}
                        className="px-3 py-1 bg-blue-500 text-white text-sm rounded-full hover:bg-blue-600 transition-colors"
                    >
                        查看更多
                    </button>
                </div>

                <div className="space-y-4">
                    {featuredShops.map((shop) => (
                        <div
                            key={shop.id}
                            onClick={() => goToShop(shop.id)}
                            className="flex cursor-pointer border-b border-gray-100 pb-4 last:border-0 last:pb-0 hover:bg-gray-50 rounded-lg p-2 transition-colors"
                        >
                            <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                                {shop.logo ? (
                                    <Image
                                        src={getImageUrl(shop.logo || '')}
                                        alt={shop.name}
                                        width={64}
                                        height={64}
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                        暂无图片
                                    </div>
                                )}
                            </div>
                            <div className="ml-3 flex-1">
                                <h3 className="font-semibold text-base mb-1">{shop.name}</h3>
                                <p className="text-sm text-gray-500 line-clamp-1 mb-2">{shop.description}</p>
                                <div className="flex items-center space-x-2">
                                    <span className="text-xs text-gray-400">{getShopTypeText(shop.shop_type)}</span>
                                    <span
                                        className={`text-xs px-2 py-0.5 rounded ${
                                            shop.is_active
                                                ? 'bg-green-100 text-green-600'
                                                : 'bg-gray-100 text-gray-500'
                                        }`}
                                    >
                    {shop.is_active ? '营业中' : '已打烊'}
                  </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 底部导航 */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom md:hidden">
                <div className="flex items-center justify-around h-14">
                    <button
                        onClick={() => handleTabChange('home')}
                        className={`flex flex-col items-center justify-center space-y-1 ${
                            activeTab === 'home' ? 'text-blue-500' : 'text-gray-500'
                        }`}
                    >
                        <Home className="w-6 h-6"/>
                        <span className="text-xs">首页</span>
                    </button>

                    <button
                        onClick={() => handleTabChange('category')}
                        className={`flex flex-col items-center justify-center space-y-1 ${
                            activeTab === 'category' ? 'text-blue-500' : 'text-gray-500'
                        }`}
                    >
                        <Grid className="w-6 h-6"/>
                        <span className="text-xs">分类</span>
                    </button>

                    <Link
                        href="/cart"
                        className="flex flex-col items-center justify-center space-y-1 text-gray-500 relative"
                    >
                        <div className="relative">
                            <ShoppingCart className="w-6 h-6"/>
                            {cartStore.totalQuantity > 0 && (
                                <span
                                    className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                  {cartStore.totalQuantity > 99 ? '99+' : cartStore.totalQuantity}
                </span>
                            )}
                        </div>
                        <span className="text-xs">购物车</span>
                    </Link>

                    <Link
                        href="/profile"
                        className={`flex flex-col items-center justify-center space-y-1 ${
                            activeTab === 'profile' ? 'text-blue-500' : 'text-gray-500'
                        }`}
                    >
                        <User className="w-6 h-6"/>
                        <span className="text-xs">我的</span>
                    </Link>
                </div>
            </nav>

            <Loading loading={loading} text="加载中..."/>
        </div>
    );
}

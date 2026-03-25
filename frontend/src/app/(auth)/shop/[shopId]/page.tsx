'use client';

import {useEffect, useState} from 'react';
import {useParams, useRouter} from 'next/navigation';
import Image from 'next/image';
import {Clock, MapPin, ShoppingBag, Star, Truck, Users} from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import Loading from '@/components/Loading';
import ProductCard from '@/components/ProductCard';
import {useCartStore} from '@/stores/cart';
import {shopApi} from '@/lib/api/shop';
import {productApi} from '@/lib/api/product';
import {getImageUrl} from '@/utils';
import {Product, Shop} from '@/types';

export default function ShopPage() {
    const params = useParams();
    const router = useRouter();
    const cartStore = useCartStore();

    const [loading, setLoading] = useState(false);
    const [shopInfo, setShopInfo] = useState<Shop | null>(null);
    const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
    const shopId = Number(params.shopId);

    // 加载店铺信息
    const loadShopInfo = async () => {
        setLoading(true);
        try {
            const response = await shopApi.getShop(shopId);
            setShopInfo(response.data);
        } catch (error) {
            console.error('加载店铺信息失败:', error);
        } finally {
            setLoading(false);
        }
    };

    // 加载推荐商品
    const loadFeaturedProducts = async () => {
        try {
            const response = await productApi.getPublicProducts(shopId, {
                page_size: 6
            });
            setFeaturedProducts(((response.data as any).results || response.data) as Product[]);
        } catch (error) {
            console.error('加载推荐商品失败:', error);
        }
    };

    useEffect(() => {
        if (shopId) {
            loadShopInfo();
            loadFeaturedProducts();
        }
    }, [shopId]);

    const goToMenu = () => {
        router.push(`/menu/${shopId}`);
    };

    const goToProduct = (productId: number) => {
        router.push(`/product/${productId}`);
    };

    const handleAddToCart = async (product: Product) => {
        try {
            await cartStore.addToCart({
                product: product.id,
                quantity: 1
            });
        } catch (error) {
            console.error('添加到购物车失败:', error);
        }
    };

    if (!shopInfo) {
        return <Loading loading={true} text="加载中..."/>;
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <AppHeader title={shopInfo.name || '店铺'} showBack={true} showCart={true}/>

            {/* 店铺头部信息 */}
            <div className="bg-white">
                <div className="relative h-36 w-full bg-gray-100">
                    {shopInfo.banner ? (
                        <Image
                            src={getImageUrl(shopInfo.banner)}
                            alt={shopInfo.name}
                            fill
                            className="object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                            店铺横幅
                        </div>
                    )}
                </div>

                <div className="p-4">
                    <div className="flex gap-3 mb-4">
                        <div
                            className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 relative border-2 border-white shadow-md">
                            {shopInfo.logo ? (
                                <Image
                                    src={getImageUrl(shopInfo.logo)}
                                    alt={shopInfo.name}
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                    暂无图片
                                </div>
                            )}
                        </div>

                        <div className="flex-1">
                            <h2 className="font-bold text-lg mb-1">{shopInfo.name}</h2>
                            <p className="text-sm text-gray-500 line-clamp-2 mb-2">{shopInfo.description}</p>
                            <div className="flex items-center">
                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400"/>
                                <span className="ml-1 text-sm font-medium">{shopInfo.rating || 5.0}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-around py-3 border-t border-gray-100">
                        <div className="flex flex-col items-center text-sm text-gray-600">
                            <Clock className="w-5 h-5 text-blue-500 mb-1"/>
                            <span>营业中</span>
                        </div>
                        <div className="flex flex-col items-center text-sm text-gray-600">
                            <MapPin className="w-5 h-5 text-blue-500 mb-1"/>
                            <span>{shopInfo.delivery_radius || 5}km</span>
                        </div>
                        <div className="flex flex-col items-center text-sm text-gray-600">
                            <ShoppingBag className="w-5 h-5 text-blue-500 mb-1"/>
                            <span>起送¥{(shopInfo.minimum_order_amount || 0) / 100}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 服务类型 */}
            {(shopInfo.allow_delivery || shopInfo.allow_pickup || shopInfo.allow_dine_in) && (
                <div className="bg-white mt-3 mx-3 rounded-xl p-4">
                    <div className="grid grid-cols-3 gap-4">
                        {shopInfo.allow_delivery && (
                            <button
                                className="flex flex-col items-center space-y-2 hover:bg-gray-50 p-2 rounded-lg transition-colors">
                                <Truck className="w-8 h-8 text-blue-500"/>
                                <span className="text-sm">外卖</span>
                            </button>
                        )}
                        {shopInfo.allow_pickup && (
                            <button
                                className="flex flex-col items-center space-y-2 hover:bg-gray-50 p-2 rounded-lg transition-colors">
                                <ShoppingBag className="w-8 h-8 text-blue-500"/>
                                <span className="text-sm">自取</span>
                            </button>
                        )}
                        {shopInfo.allow_dine_in && (
                            <button
                                className="flex flex-col items-center space-y-2 hover:bg-gray-50 p-2 rounded-lg transition-colors">
                                <Users className="w-8 h-8 text-blue-500"/>
                                <span className="text-sm">堂食</span>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* 推荐商品 */}
            {featuredProducts.length > 0 && (
                <div className="bg-white mt-3 mx-3 rounded-xl p-4">
                    <h3 className="font-bold text-lg mb-4">推荐商品</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {featuredProducts.map((product) => (
                            <ProductCard
                                key={product.id}
                                id={product.id}
                                name={product.name}
                                description={product.description}
                                price={product.price}
                                originalPrice={product.original_price}
                                image={product.image}
                                isAvailable={product.is_available}
                                onClick={() => goToProduct(product.id)}
                                onAddToCart={() => handleAddToCart(product)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* 行动按钮 */}
            <div className="fixed bottom-0 left-0 right-0 p-3 bg-white border-t border-gray-200 safe-area-bottom">
                <button
                    onClick={goToMenu}
                    className="w-full bg-blue-500 text-white py-3 rounded-full font-medium hover:bg-blue-600 transition-colors"
                >
                    进入店铺点餐
                </button>
            </div>

            <Loading loading={loading} text="加载中..."/>
        </div>
    );
}

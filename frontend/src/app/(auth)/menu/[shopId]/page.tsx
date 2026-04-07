'use client';

import {useEffect, useRef, useState} from 'react';
import {useParams, useRouter} from 'next/navigation';
import Link from 'next/link';
import {ShoppingCart} from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import Loading from '@/components/Loading';
import ProductCard from '@/components/ProductCard';
import {useCartStore} from '@/stores/cart';
import {useUserStore} from '@/stores/user';
import {shopApi} from '@/lib/api/shop';
import {productApi} from '@/lib/api/product';
import {formatPrice} from '@/utils';
import {Category, Product, Shop} from '@/types';

interface CategoryWithProducts extends Category {
    products: Product[];
}

export default function MenuPage() {
    const params = useParams();
    const router = useRouter();
    const cartStore = useCartStore();
    const userStore = useUserStore();

    const [loading, setLoading] = useState(false);
    const [activeCategory, setActiveCategory] = useState(0);
    const [shopInfo, setShopInfo] = useState<Shop | null>(null);
    const [categories, setCategories] = useState<CategoryWithProducts[]>([]);
    const categoryRefs = useRef<(HTMLDivElement | null)[]>([]);
    const shopId = Number(params.shopId);

    // 加载购物车
    const loadCart = async () => {
        if (userStore.isLoggedIn) {
            try {
                await cartStore.getCart();
            } catch (error) {
                console.log('加载购物车失败:', error);
            }
        }
    };

    // 加载店铺信息
    const loadShopInfo = async () => {
        try {
            const response = await shopApi.getShop(shopId);
            setShopInfo(response.data);
        } catch (error) {
            console.error('加载店铺信息失败:', error);
        }
    };

    // 加载分类和商品
    const loadCategories = async () => {
        setLoading(true);
        try {
            const response = await productApi.getCategories(shopId);
            const categoriesData = response.data;

            // 处理可能的分页响应格式
            const categoriesArray = Array.isArray(categoriesData)
                ? categoriesData
                : (categoriesData.results || []);

            if (!Array.isArray(categoriesArray)) {
                console.error('分类数据格式错误:', categoriesData);
                setCategories([]);
                return;
            }

            // 为每个分类加载商品
            const categoriesWithProducts = await Promise.all(
                categoriesArray.map(async (category: Category) => {
                    try {
                        const productResponse = await productApi.getPublicProducts(shopId, {
                            category: category.id,
                            page_size: 50
                        });
                        const productsData = productResponse.data;
                        const products = Array.isArray(productsData)
                            ? productsData
                            : ((productsData as any).results || []);

                        return {
                            ...category,
                            products: products as Product[]
                        };
                    } catch (error) {
                        console.error(`加载分类 ${category.name} 的商品失败:`, error);
                        return {
                            ...category,
                            products: []
                        };
                    }
                })
            );

            setCategories(categoriesWithProducts);
        } catch (error) {
            console.error('加载分类失败:', error);
            setCategories([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (shopId) {
            loadShopInfo();
            loadCategories();
            loadCart();
        }
    }, [shopId]);

    const scrollToCategory = (index: number) => {
        setActiveCategory(index);
        const element = categoryRefs.current[index];
        if (element) {
            element.scrollIntoView({behavior: 'smooth'});
        }
    };

    const goToProduct = (productId: number) => {
        router.push(`/product/${productId}`);
    };

    const handleAddToCart = async (productId: number) => {
        try {
            await cartStore.addToCart({product: productId, quantity: 1});
            alert('已添加到购物车');
        } catch (error) {
            console.error('添加购物车失败:', error);
            alert('添加失败，请重试');
        }
    };

    const goToCart = () => {
        router.push('/cart');
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <AppHeader title={shopInfo?.name || '菜单'} showBack={true} showCart={true}/>

            <div className="flex h-[calc(100vh-3.5rem)]">
                {/* 侧边分类导航 */}
                <div className="w-24 bg-white border-r border-gray-200 overflow-y-auto flex-shrink-0">
                    {categories.map((category, index) => (
                        <button
                            key={category.id}
                            onClick={() => scrollToCategory(index)}
                            className={`w-full py-4 px-2 text-sm transition-colors ${
                                activeCategory === index
                                    ? 'bg-blue-50 text-blue-600 font-medium'
                                    : 'text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            {category.name}
                        </button>
                    ))}
                </div>

                {/* 商品列表 */}
                <div className="flex-1 overflow-y-auto bg-gray-50 p-3 space-y-3">
                    {categories.map((category, index) => (
                        <div
                            key={category.id}
                            ref={(el) => {
                                categoryRefs.current[index] = el;
                            }}
                            className="bg-white rounded-xl p-4"
                        >
                            <h3 className="font-bold text-base mb-3 pb-2 border-b border-gray-100">
                                {category.name}
                            </h3>
                            <div className="space-y-3">
                                {category.products.map((product) => (
                                    <ProductCard
                                        key={product.id}
                                        id={product.id}
                                        name={product.name}
                                        description={product.description}
                                        price={product.price}
                                        originalPrice={product.original_price}
                                        image={product.image}
                                        isAvailable={product.is_available}
                                        onAddToCart={() => handleAddToCart(product.id)}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}

                    {categories.length === 0 && !loading && (
                        <div className="text-center py-12 text-gray-400">
                            暂无商品
                        </div>
                    )}
                </div>
            </div>

            {/* 购物车底部栏 */}
            {cartStore.totalQuantity > 0 && (
                <div
                    className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 safe-area-bottom md:max-w-md md:left-1/2 md:-translate-x-1/2">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/cart"
                            className="relative p-2 bg-blue-500 rounded-full text-white"
                        >
                            <ShoppingCart className="w-6 h-6"/>
                            {cartStore.totalQuantity > 0 && (
                                <span
                                    className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                  {cartStore.totalQuantity > 99 ? '99+' : cartStore.totalQuantity}
                </span>
                            )}
                        </Link>

                        <div className="flex-1">
                            <div className="text-lg font-bold text-red-500">
                                {formatPrice(cartStore.totalPrice)}
                            </div>
                            <div className="text-xs text-gray-500">
                                另需配送费{formatPrice(shopInfo?.delivery_fee || 0)}
                            </div>
                        </div>

                        <button
                            onClick={goToCart}
                            className="px-6 py-2.5 bg-blue-500 text-white rounded-full font-medium hover:bg-blue-600 transition-colors"
                        >
                            去结算
                        </button>
                    </div>
                </div>
            )}

            <Loading loading={loading} text="加载中..."/>
        </div>
    );
}

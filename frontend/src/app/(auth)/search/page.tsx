'use client';

import {useEffect, useState, Suspense} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import Image from 'next/image';
import {Search, Trash2} from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import Loading from '@/components/Loading';
import ProductCard from '@/components/ProductCard';
import {shopApi} from '@/lib/api/shop';
import {productApi} from '@/lib/api/product';
import {useCartStore} from '@/stores/cart';
import {getImageUrl} from '@/utils';
import {Product, Shop} from '@/types';

export default function SearchPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">加载中...</div>}>
            <SearchContent/>
        </Suspense>
    );
}

function SearchContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const cartStore = useCartStore();

    const [keyword, setKeyword] = useState('');
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [searchHistory, setSearchHistory] = useState<string[]>([]);
    const [shops, setShops] = useState<Shop[]>([]);
    const [products, setProducts] = useState<Product[]>([]);

    const hotTags = ['奶茶', '咖啡', '蛋糕', '披萨', '汉堡', '果汁'];

    // 加载搜索历史
    const loadHistory = () => {
        const history = localStorage.getItem('search_history');
        if (history) {
            setSearchHistory(JSON.parse(history));
        }
    };

    // 保存搜索历史
    const saveHistory = (keyword: string) => {
        const newHistory = [keyword, ...searchHistory.filter(h => h !== keyword)].slice(0, 10);
        setSearchHistory(newHistory);
        localStorage.setItem('search_history', JSON.stringify(newHistory));
    };

    // 清除历史
    const clearHistory = () => {
        setSearchHistory([]);
        localStorage.removeItem('search_history');
    };

    // 执行搜索
    const handleSearch = async () => {
        if (!keyword || !keyword.trim()) {
            alert('请输入搜索内容');
            return;
        }

        setLoading(true);
        setHasSearched(true);

        try {
            // 保存搜索历史
            saveHistory(keyword);

            // 搜索店铺
            const shopResponse = await shopApi.getShops({
                search: keyword,
                is_active: true
            });
            setShops((shopResponse.data as any).results || shopResponse.data);

            // 搜索商品
            const productResponse = await productApi.getPublicProducts(0, {
                search: keyword,
                page_size: 20
            });
            setProducts(((productResponse.data as any).results || productResponse.data) as Product[]);
        } catch (error) {
            console.error('搜索失败:', error);
            alert('搜索失败，请稍后重试');
        } finally {
            setLoading(false);
        }
    };

    // 从 URL 参数获取搜索关键词
    useEffect(() => {
        const queryKeyword = searchParams.get('q');
        if (queryKeyword) {
            setKeyword(queryKeyword);
            // 自动执行搜索
            setTimeout(() => {
                handleSearch();
            }, 100);
        }
        loadHistory();
    }, [searchParams]);

    const searchByHistory = (item: string) => {
        setKeyword(item);
        handleSearch();
    };

    const searchByTag = (tag: string) => {
        setKeyword(tag);
        handleSearch();
    };

    const goToShop = (shopId: number) => {
        router.push(`/shop/${shopId}`);
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

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <AppHeader showBack={true} title="搜索"/>

            {/* 搜索栏 */}
            <div className="bg-white p-3">
                <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="搜索店铺或商品"
                            className="w-full px-4 py-2 pl-10 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/>
                    </div>
                    <button
                        onClick={handleSearch}
                        className="px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
                    >
                        搜索
                    </button>
                </div>
            </div>

            {/* 搜索历史和热门搜索 */}
            {!hasSearched && (
                <>
                    {/* 搜索历史 */}
                    {searchHistory.length > 0 && (
                        <div className="bg-white p-4 mb-3">
                            <div className="flex items-center justify-between mb-3">
                                <span className="font-semibold">搜索历史</span>
                                <button onClick={clearHistory} className="text-gray-400 hover:text-gray-600">
                                    <Trash2 className="w-5 h-5"/>
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {searchHistory.map((item, index) => (
                                    <button
                                        key={index}
                                        onClick={() => searchByHistory(item)}
                                        className="px-3 py-1.5 bg-blue-50 text-blue-600 text-sm rounded-full hover:bg-blue-100 transition-colors"
                                    >
                                        {item}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 热门搜索 */}
                    <div className="bg-white p-4">
                        <div className="font-semibold mb-3">热门搜索</div>
                        <div className="flex flex-wrap gap-2">
                            {hotTags.map((tag, index) => (
                                <button
                                    key={index}
                                    onClick={() => searchByTag(tag)}
                                    className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-full hover:bg-gray-200 transition-colors"
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* 搜索结果 */}
            {hasSearched && (
                <>
                    {/* 店铺结果 */}
                    {shops.length > 0 && (
                        <div className="bg-white p-4 mb-3">
                            <div className="font-bold text-lg mb-4">相关店铺</div>
                            <div className="space-y-4">
                                {shops.map((shop) => (
                                    <div
                                        key={shop.id}
                                        onClick={() => goToShop(shop.id)}
                                        className="flex cursor-pointer hover:bg-gray-50 rounded-lg p-2 transition-colors"
                                    >
                                        <div
                                            className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 relative">
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
                                        <div className="ml-3 flex-1">
                                            <h3 className="font-semibold text-base mb-1">{shop.name}</h3>
                                            <p className="text-sm text-gray-500 line-clamp-2 mb-2">{shop.description}</p>
                                            {shop.is_active && (
                                                <span
                                                    className="px-2 py-0.5 bg-green-100 text-green-600 text-xs rounded">
                          营业中
                        </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 商品结果 */}
                    {products.length > 0 && (
                        <div className="bg-white p-4">
                            <div className="font-bold text-lg mb-4">相关商品</div>
                            <div className="grid grid-cols-2 gap-3">
                                {products.map((product) => (
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

                    {/* 空状态 */}
                    {shops.length === 0 && products.length === 0 && (
                        <div className="text-center py-12">
                            <Search className="w-16 h-16 mx-auto text-gray-300 mb-4"/>
                            <p className="text-gray-500">未找到相关内容</p>
                        </div>
                    )}
                </>
            )}

            <Loading loading={loading} text="加载中..."/>
        </div>
    );
}

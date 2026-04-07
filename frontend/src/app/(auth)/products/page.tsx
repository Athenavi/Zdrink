'use client';

import {Suspense, useEffect, useState} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import {Search, SlidersHorizontal} from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import Loading from '@/components/Loading';
import ProductCard from '@/components/ProductCard';
import {productApi} from '@/lib/api/product';
import {shopApi} from '@/lib/api/shop';
import {useCartStore} from '@/stores/cart';
import {Category, Product, Shop} from '@/types';

export default function ProductsPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">加载中...</div>}>
            <ProductsContent/>
        </Suspense>
    );
}

function ProductsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const cartStore = useCartStore();

    const categoryId = searchParams.get('category_id');
    const categoryName = searchParams.get('category_name') || '全部商品';
    const shopId = searchParams.get('shop_id');

    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [shopInfo, setShopInfo] = useState<Shop | null>(null);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [sortBy, setSortBy] = useState<'default' | 'price_asc' | 'price_desc' | 'sales'>('default');

    useEffect(() => {
        if (shopId) {
            loadShopInfo(Number(shopId));
        }
        loadCategories();
        loadProducts();
    }, [categoryId, shopId, sortBy]);

    const loadShopInfo = async (id: number) => {
        try {
            const response = await shopApi.getShop(id);
            setShopInfo(response.data);
        } catch (error) {
            console.error('加载店铺信息失败:', error);
        }
    };

    const loadCategories = async () => {
        if (!shopId) return;

        try {
            const response = await productApi.getCategories(Number(shopId));
            setCategories(response.data.results || response.data || []);
        } catch (error) {
            console.error('加载分类失败:', error);
        }
    };

    const loadProducts = async (pageNum = 1) => {
        if (!shopId) return;

        setLoading(true);
        try {
            const params: Record<string, any> = {
                page: pageNum,
                page_size: 20
            };

            if (categoryId) {
                params.category = categoryId;
            }

            // 排序参数
            if (sortBy === 'price_asc') {
                params.ordering = 'price';
            } else if (sortBy === 'price_desc') {
                params.ordering = '-price';
            } else if (sortBy === 'sales') {
                params.ordering = '-sales_count';
            }

            const response = await productApi.getPublicProducts(Number(shopId), params);
            const data = response.data;
            const productList = Array.isArray(data.results) ? data.results : [];
            const count = data.count || 0;

            if (pageNum === 1) {
                setProducts(productList);
            } else {
                setProducts(prev => [...prev, ...productList]);
            }

            setTotal(count);
            setHasMore(pageNum * 20 < count);
            setPage(pageNum);
        } catch (error) {
            console.error('加载商品失败:', error);
            setProducts([]);
        } finally {
            setLoading(false);
        }
    };

    const handleLoadMore = () => {
        if (hasMore && !loading) {
            loadProducts(page + 1);
        }
    };

    const handleProductClick = (productId: number) => {
        router.push(`/product/${productId}`);
    };

    const handleAddToCart = async (product: Product, quantity: number = 1) => {
        await cartStore.addToCart(product.id, quantity);
    };

    const getSortedLabel = () => {
        switch (sortBy) {
            case 'price_asc':
                return '价格升序';
            case 'price_desc':
                return '价格降序';
            case 'sales':
                return '销量最高';
            default:
                return '默认排序';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <AppHeader title={categoryName}/>

            {/* 筛选栏 */}
            <div className="bg-white border-b border-gray-200 sticky top-14 z-10">
                <div className="flex items-center justify-between px-3 py-2">
                    <div className="flex items-center gap-2 overflow-x-auto">
                        <button
                            onClick={() => router.push(`/menu/${shopId}`)}
                            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
                                !categoryId ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'
                            }`}
                        >
                            全部
                        </button>
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => router.push(`/products?shop_id=${shopId}&category_id=${cat.id}&category_name=${cat.name}`)}
                                className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
                                    Number(categoryId) === cat.id ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'
                                }`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => {
                            const sorts: Array<'default' | 'price_asc' | 'price_desc' | 'sales'> = [
                                'default',
                                'price_asc',
                                'price_desc',
                                'sales'
                            ];
                            const currentIndex = sorts.indexOf(sortBy);
                            const nextIndex = (currentIndex + 1) % sorts.length;
                            setSortBy(sorts[nextIndex]);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-full text-sm text-gray-700 hover:bg-gray-200 transition-colors"
                    >
                        <SlidersHorizontal className="w-4 h-4"/>
                        <span>{getSortedLabel()}</span>
                    </button>
                </div>
            </div>

            {/* 商品列表 */}
            {loading && products.length === 0 ? (
                <Loading/>
            ) : products.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                    <Search className="w-16 h-16 mx-auto mb-3 opacity-30"/>
                    <p>暂无商品</p>
                </div>
            ) : (
                <div className="p-3 grid grid-cols-2 gap-3">
                    {products.map((product) => (
                        <ProductCard
                            key={product.id}
                            product={product}
                            onClick={() => handleProductClick(product.id)}
                            onAddToCart={(quantity) => handleAddToCart(product, quantity)}
                        />
                    ))}
                </div>
            )}

            {/* 加载更多 */}
            {hasMore && products.length > 0 && (
                <div className="p-4 text-center">
                    <button
                        onClick={handleLoadMore}
                        disabled={loading}
                        className="px-6 py-2 bg-white text-blue-500 rounded-lg text-sm hover:bg-blue-50 disabled:opacity-50 transition-colors"
                    >
                        {loading ? '加载中...' : '加载更多'}
                    </button>
                </div>
            )}
        </div>
    );
}

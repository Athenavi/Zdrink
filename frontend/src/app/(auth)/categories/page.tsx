'use client';

import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import Image from 'next/image';
import {ChevronRight, Grid} from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import Loading from '@/components/Loading';
import {productApi} from '@/lib/api/product';
import {getImageUrl} from '@/utils';
import {Category} from '@/types';

export default function CategoriesPage() {
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);

    // 加载分类列表
    const loadCategories = async () => {
        setLoading(true);
        try {
            const response = await productApi.getCategories(0);
            setCategories((response.data as any).results || response.data);
        } catch (error) {
            console.error('加载分类失败:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCategories();
    }, []);

    const goToCategory = (category: Category) => {
        router.push(`/products?category_id=${category.id}&category_name=${category.name}`);
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <AppHeader showBack={true} title="全部分类"/>

            {/* 分类列表 */}
            <div className="p-3 space-y-3">
                {categories.map((category) => (
                    <div
                        key={category.id}
                        onClick={() => goToCategory(category)}
                        className="bg-white rounded-xl p-4 cursor-pointer hover:bg-gray-50 transition-colors relative flex items-center"
                    >
                        <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 bg-gray-100 relative mr-4">
                            {category.icon ? (
                                <Image
                                    src={getImageUrl(category.icon)}
                                    alt={category.name}
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <Grid className="w-8 h-8"/>
                                </div>
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base truncate mb-1">{category.name}</h3>
                            {category.description && (
                                <p className="text-sm text-gray-500 line-clamp-2 mb-1">
                                    {category.description}
                                </p>
                            )}
                            {category.product_count !== undefined && (
                                <div className="text-xs text-gray-400">
                                    {category.product_count}个商品
                                </div>
                            )}
                        </div>

                        <ChevronRight className="w-5 h-5 text-gray-400"/>
                    </div>
                ))}

                {/* 空状态 */}
                {!loading && categories.length === 0 && (
                    <div className="text-center py-12">
                        <Grid className="w-16 h-16 mx-auto text-gray-300 mb-4"/>
                        <p className="text-gray-500">暂无分类</p>
                    </div>
                )}
            </div>

            <Loading loading={loading} text="加载中..."/>
        </div>
    );
}

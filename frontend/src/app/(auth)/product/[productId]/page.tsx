'use client';

import {useEffect, useState} from 'react';
import {useParams, useRouter} from 'next/navigation';
import Image from 'next/image';
import {ChevronLeft, ChevronRight, Clock, Edit, Store} from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import Loading from '@/components/Loading';
import {productApi} from '@/lib/api/product';
import {useCartStore} from '@/stores/cart';
import {formatPrice, getImageUrl} from '@/utils';
import {Product, SKU} from '@/types';

export default function ProductPage() {
    const params = useParams();
    const router = useRouter();
    const cartStore = useCartStore();

    const [loading, setLoading] = useState(false);
    const [product, setProduct] = useState<Product | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [selectedSkuId, setSelectedSkuId] = useState<number | null>(null);
    const [selectedAttributes, setSelectedAttributes] = useState<Record<number, number>>({});
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const productId = Number(params.productId);

    // 商品图片
    const productImages = product ? [
        ...(product.main_image ? [product.main_image] : []),
        ...(product.images || [])
    ].filter(Boolean) : [];

    // 可用的SKU
    const availableSkus = (product?.skus || []).filter(sku => sku.is_active);

    // 选中的 SKU
    const selectedSku = availableSkus.find(sku => sku.id === selectedSkuId) || availableSkus[0];

    // 显示价格
    const displayPrice = selectedSku ? selectedSku.price : product?.base_price || 0;

    // 最大购买数量
    const maxQuantity = selectedSku ? Math.min(selectedSku.stock_quantity || 99, 99) : 99;

    // 是否可以添加到购物车
    const canAddToCart = selectedSku && selectedSku.is_in_stock && quantity > 0;

    // 添加按钮文本
    const addButtonText = !selectedSku || !selectedSku.is_in_stock ? '缺货' : '加入购物车';

    // 加载商品信息
    const loadProduct = async () => {
        setLoading(true);
        try {
            const response = await productApi.getProduct(productId);
            setProduct(response.data);

            // 设置默认选中的 SKU
            if (response.data.skus && response.data.skus.length > 0) {
                const defaultSku = response.data.skus.find(
                    sku => sku.is_active && sku.is_in_stock
                );
                setSelectedSkuId(defaultSku ? defaultSku.id : response.data.skus[0].id);
            }

            // 初始化属性选择
            if (response.data.attributes) {
                const attrs: Record<number, number> = {};
                response.data.attributes.forEach(attr => {
                    if (attr.options && attr.options.length > 0) {
                        attrs[attr.id] = attr.options[0].id;
                    }
                });
                setSelectedAttributes(attrs);
            }
        } catch (error) {
            console.error('加载商品失败:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (productId) {
            loadProduct();
        }
    }, [productId]);

    // 自动轮播图片
    useEffect(() => {
        if (productImages.length <= 1) return;

        const timer = setInterval(() => {
            setCurrentImageIndex(prev => (prev + 1) % productImages.length);
        }, 3000);

        return () => clearInterval(timer);
    }, [productImages.length]);

    const getSkuName = (sku: SKU) => {
        if (!sku.specifications || Object.keys(sku.specifications).length === 0) {
            return '默认规格';
        }
        return Object.entries(sku.specifications)
            .map(([key, value]) => `${key}: ${value}`)
            .join(' ');
    };

    const addToCart = async () => {
        if (!canAddToCart || !product) return;

        try {
            const cartData: any = {
                product: product.id,
                quantity: quantity
            };

            // 添加 SKU 信息
            if (selectedSku && selectedSku.id !== product.id) {
                cartData.sku_id = selectedSku.id;
            }

            // 添加属性选项
            const attributeOptionIds = Object.values(selectedAttributes).filter(id => id);
            if (attributeOptionIds.length > 0) {
                cartData.attribute_option_ids = attributeOptionIds;
            }

            await cartStore.addToCart(cartData);
        } catch (error) {
            console.error('添加到购物车失败:', error);
        }
    };

    const goToShop = () => {
        if (product?.shop) {
            router.push(`/shop/${product.shop}`);
        }
    };

    const prevImage = () => {
        setCurrentImageIndex(prev => (prev - 1 + productImages.length) % productImages.length);
    };

    const nextImage = () => {
        setCurrentImageIndex(prev => (prev + 1) % productImages.length);
    };

    if (!product) {
        return <Loading loading={true} text="加载中..."/>;
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <AppHeader title={product.name || '商品详情'} showBack={true} showCart={true}/>

            <div className="pb-4">
                {/* 商品图片轮播 */}
                {productImages.length > 0 ? (
                    <div className="relative h-72 w-full bg-gray-100">
                        <Image
                            src={getImageUrl(productImages[currentImageIndex])}
                            alt={product.name}
                            fill
                            className="object-cover"
                            priority
                        />

                        {/* 左右切换按钮 */}
                        {productImages.length > 1 && (
                            <>
                                <button
                                    onClick={prevImage}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/30 rounded-full text-white hover:bg-black/50"
                                >
                                    <ChevronLeft className="w-6 h-6"/>
                                </button>
                                <button
                                    onClick={nextImage}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/30 rounded-full text-white hover:bg-black/50"
                                >
                                    <ChevronRight className="w-6 h-6"/>
                                </button>
                            </>
                        )}

                        {/* 指示器 */}
                        {productImages.length > 1 && (
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                                {productImages.map((_, index) => (
                                    <div
                                        key={index}
                                        className={`w-2 h-2 rounded-full transition-colors ${
                                            index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                                        }`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="h-72 w-full bg-gray-100 flex items-center justify-center text-gray-400">
                        暂无图片
                    </div>
                )}

                {/* 商品基础信息 */}
                <div className="bg-white p-4 mb-3">
                    <div className="mb-3">
            <span className="text-2xl font-bold text-red-500">
              {formatPrice(displayPrice)}
            </span>
                        {product.cost_price && (
                            <span className="ml-2 text-sm text-gray-400 line-through">
                {formatPrice(product.cost_price || 0)}
              </span>
                        )}
                    </div>

                    <h1 className="font-bold text-lg mb-2">{product.name}</h1>

                    {product.description && (
                        <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                            {product.description}
                        </p>
                    )}

                    <div className="flex gap-4 text-sm text-gray-500">
                        <span>月售{product.sales_count || 0}</span>
                        <span>评分{product.rating || 5.0}</span>
                    </div>
                </div>

                {/* 规格选择 */}
                {availableSkus.length > 1 && (
                    <div className="bg-white p-4 mb-3">
                        <div className="font-semibold mb-3 pb-2 border-b border-gray-100">
                            规格选择
                        </div>
                        <div className="space-y-2">
                            {availableSkus.map((sku) => (
                                <button
                                    key={sku.id}
                                    onClick={() => setSelectedSkuId(sku.id)}
                                    disabled={!sku.is_in_stock}
                                    className={`w-full p-3 rounded-lg border transition-all ${
                                        selectedSkuId === sku.id
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                    } ${!sku.is_in_stock ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium">{getSkuName(sku)}</span>
                                        <div className="flex items-center gap-2">
                      <span className="text-red-500 font-semibold">
                        {formatPrice(sku.price)}
                      </span>
                                            {!sku.is_in_stock && (
                                                <span className="text-xs text-gray-400">缺货</span>
                                            )}
                                            {sku.is_low_stock && sku.is_in_stock && (
                                                <span className="text-xs text-orange-500">
                          仅剩{sku.stock_quantity}件
                        </span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* 商品属性（定制选项） */}
                {product.attributes && product.attributes.length > 0 && (
                    <div className="bg-white p-4 mb-3">
                        <div className="font-semibold mb-3 pb-2 border-b border-gray-100">
                            定制选项
                        </div>
                        <div className="space-y-4">
                            {product.attributes.map((attr) => (
                                <div key={attr.id}>
                                    <div className="font-medium mb-2">
                                        {attr.name}
                                        {attr.is_required && <span className="text-red-500 ml-1">*</span>}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {attr.options?.map((option) => (
                                            <button
                                                key={option.id}
                                                onClick={() => setSelectedAttributes(prev => ({
                                                    ...prev,
                                                    [attr.id]: option.id
                                                }))}
                                                className={`px-4 py-2 rounded-lg border transition-all ${
                                                    selectedAttributes[attr.id] === option.id
                                                        ? 'border-blue-500 bg-blue-50 text-blue-600'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                            >
                                                <span>{option.value}</span>
                                                {option.additional_price && option.additional_price > 0 && (
                                                    <span className="text-red-500 ml-1 text-sm">
                            +{formatPrice(option.additional_price)}
                          </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 商品详情 */}
                <div className="bg-white p-4">
                    <div className="font-semibold mb-3 pb-2 border-b border-gray-100">
                        商品详情
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="w-4 h-4 text-blue-500"/>
                            <span>预计{product.preparation_time || 10}分钟制作完成</span>
                        </div>
                        {product.allow_customization && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Edit className="w-4 h-4 text-blue-500"/>
                                <span>支持定制要求</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 底部操作栏 */}
            <div
                className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 safe-area-bottom md:max-w-md md:left-1/2 md:-translate-x-1/2">
                <div className="flex items-center gap-3">
                    <button
                        onClick={goToShop}
                        className="px-4 py-2.5 border border-gray-300 rounded-full flex items-center gap-2 hover:bg-gray-50 transition-colors"
                    >
                        <Store className="w-5 h-5"/>
                        <span>店铺</span>
                    </button>

                    <div className="flex-1 flex items-center gap-3">
                        <div className="flex items-center border border-gray-300 rounded-full">
                            <button
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                className="px-3 py-2 text-gray-600 hover:text-blue-500"
                            >
                                -
                            </button>
                            <span className="px-2 font-medium min-w-[2rem] text-center">
                {quantity}
              </span>
                            <button
                                onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                                className="px-3 py-2 text-gray-600 hover:text-blue-500"
                            >
                                +
                            </button>
                        </div>

                        <button
                            onClick={addToCart}
                            disabled={!canAddToCart}
                            className={`flex-1 py-2.5 rounded-full font-medium transition-colors ${
                                canAddToCart
                                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                        >
                            {addButtonText}
                        </button>
                    </div>
                </div>
            </div>

            <Loading loading={loading} text="加载中..."/>
        </div>
    );
}

'use client';

import {useEffect, useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';
import Image from 'next/image';
import {CheckCircle2, Circle, Trash2} from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import Loading from '@/components/Loading';
import {useCartStore} from '@/stores/cart';
import {formatPrice, getImageUrl} from '@/utils';

type OrderType = 'dine_in' | 'takeaway' | 'delivery';

export default function CartPage() {
    const router = useRouter();
    const cartStore = useCartStore();

    const [loading, setLoading] = useState(false);
    const [orderType, setOrderType] = useState<OrderType>('dine_in');
    const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

    // 初始化加载购物车
    useEffect(() => {
        cartStore.getCart();
    }, []);

    // 初始化选中状态
    useEffect(() => {
        if (cartStore.cartItems.length > 0) {
            // 默认选中所有商品
            const initialSelected = new Set(cartStore.cartItems.map(item => item.id));
            setSelectedItems(initialSelected);
        }
    }, [cartStore.cartItems]);

    // 全选状态
    const allSelected = useMemo(() => {
        return cartStore.cartItems.length > 0 &&
            cartStore.cartItems.every(item => selectedItems.has(item.id));
    }, [cartStore.cartItems, selectedItems]);

    // 选中商品总价
    const selectedTotalPrice = useMemo(() => {
        return cartStore.cartItems
            .filter(item => selectedItems.has(item.id))
            .reduce((total, item) => total + (item.unit_price * item.quantity), 0);
    }, [cartStore.cartItems, selectedItems]);

    // 配送费
    const deliveryFee = useMemo(() => {
        return orderType === 'delivery' ? 500 : 0;
    }, [orderType]);

    // 切换单个商品选中状态
    const toggleItemSelection = (itemId: number) => {
        setSelectedItems(prev => {
            const next = new Set(prev);
            if (next.has(itemId)) {
                next.delete(itemId);
            } else {
                next.add(itemId);
            }
            return next;
        });
    };

    // 全选/取消全选
    const toggleSelectAll = () => {
        if (allSelected) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(cartStore.cartItems.map(item => item.id)));
        }
    };

    // 更新商品数量
    const updateQuantity = async (itemId: number, quantity: number) => {
        try {
            await cartStore.updateCartItem(itemId, quantity);
        } catch (error) {
            console.error('更新数量失败:', error);
        }
    };

    // 删除商品
    const removeItem = async (itemId: number) => {
        if (!confirm('确定要从购物车中删除这个商品吗？')) {
            return;
        }

        try {
            await cartStore.removeCartItem(itemId);
            setSelectedItems(prev => {
                const next = new Set(prev);
                next.delete(itemId);
                return next;
            });
        } catch (error) {
            console.error('删除失败:', error);
        }
    };

    // 去结算
    const goToCheckout = () => {
        if (selectedItems.size === 0) {
            return;
        }

        const selectedCartItems = cartStore.cartItems
            .filter(item => selectedItems.has(item.id))
            .map((item) => ({
                id: item.id,
                product_id: item.product.id,
                sku_id: item.sku?.id,
                quantity: item.quantity
            })) as any[];

        // 存储选中的商品信息
        localStorage.setItem('selectedCartItems', JSON.stringify(selectedCartItems));
        localStorage.setItem('orderType', orderType);

        router.push('/order/create');
    };

    const goToHome = () => {
        router.push('/home');
    };

    const getSkuSpecText = (sku: any) => {
        if (!sku || !sku.specifications) return '';
        return Object.values(sku.specifications).join(' ');
    };

    if (cartStore.cartItems.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <AppHeader title="购物车"/>

                <div className="flex-1 flex items-center justify-center p-4">
                    <div className="text-center">
                        <div className="w-32 h-32 mx-auto mb-6 text-gray-300">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round"
                                      d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.148 5.462c.125.595.188.892.066 1.126a1.125 1.125 0 01-.471.471c-.233.122-.53.059-1.126-.066l-11.03-2.32A2.25 2.25 0 016 10.902V6.75a3 3 0 013-3h10.5a3 3 0 013 3v1.125c0 .414-.076.816-.222 1.194z"/>
                            </svg>
                        </div>
                        <p className="text-gray-500 text-lg mb-6">购物车空空如也</p>
                        <button
                            onClick={goToHome}
                            className="px-8 py-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors font-medium"
                        >
                            去逛逛
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-32">
            <AppHeader title="购物车"/>

            {/* 用餐方式选择 */}
            <div className="bg-white m-3 mt-3 rounded-xl p-4">
                <div className="font-semibold mb-3">选择用餐方式</div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setOrderType('dine_in')}
                        className={`flex-1 py-2.5 rounded-lg font-medium transition-all ${
                            orderType === 'dine_in'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        堂食
                    </button>
                    <button
                        onClick={() => setOrderType('takeaway')}
                        className={`flex-1 py-2.5 rounded-lg font-medium transition-all ${
                            orderType === 'takeaway'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        外带
                    </button>
                    <button
                        onClick={() => setOrderType('delivery')}
                        className={`flex-1 py-2.5 rounded-lg font-medium transition-all ${
                            orderType === 'delivery'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        外卖
                    </button>
                </div>
            </div>

            {/* 购物车商品列表 */}
            <div className="space-y-1 px-3">
                {cartStore.cartItems.map((item) => (
                    <div key={item.id} className="bg-white rounded-xl p-3 flex gap-3">
                        <button
                            onClick={() => toggleItemSelection(item.id)}
                            className="flex-shrink-0 pt-1"
                        >
                            {selectedItems.has(item.id) ? (
                                <CheckCircle2 className="w-6 h-6 text-blue-500"/>
                            ) : (
                                <Circle className="w-6 h-6 text-gray-300"/>
                            )}
                        </button>

                        <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 relative">
                            {item.product.main_image ? (
                                <Image
                                    src={getImageUrl(item.product.main_image)}
                                    alt={item.product.name}
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                    暂无图片
                                </div>
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base truncate mb-1">{item.product.name}</h3>
                            {item.sku && getSkuSpecText(item.sku) && (
                                <p className="text-sm text-gray-500 mb-2">
                                    {getSkuSpecText(item.sku)}
                                </p>
                            )}
                            <div className="text-lg font-bold text-red-500 mb-2">
                                {formatPrice(item.unit_price)}
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex items-center border border-gray-300 rounded-lg">
                                    <button
                                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                        disabled={item.quantity <= 1}
                                        className="px-3 py-1 text-gray-600 hover:text-blue-500 disabled:opacity-30"
                                    >
                                        -
                                    </button>
                                    <span className="px-2 font-medium min-w-[2rem] text-center">
                    {item.quantity}
                  </span>
                                    <button
                                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                        className="px-3 py-1 text-gray-600 hover:text-blue-500"
                                    >
                                        +
                                    </button>
                                </div>

                                <button
                                    onClick={() => removeItem(item.id)}
                                    className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors flex items-center gap-1"
                                >
                                    <Trash2 className="w-4 h-4"/>
                                    <span>删除</span>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* 结算栏 */}
            <div
                className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 safe-area-bottom md:max-w-md md:left-1/2 md:-translate-x-1/2">
                <div className="flex items-center gap-3">
                    <button
                        onClick={toggleSelectAll}
                        className="flex items-center gap-2"
                    >
                        {allSelected ? (
                            <CheckCircle2 className="w-6 h-6 text-blue-500"/>
                        ) : (
                            <Circle className="w-6 h-6 text-gray-300"/>
                        )}
                        <span>全选</span>
                    </button>

                    <div className="flex-1">
                        <div className="text-lg font-bold text-red-500">
                            合计：{formatPrice(selectedTotalPrice)}
                        </div>
                        {selectedTotalPrice > 0 && deliveryFee > 0 && (
                            <div className="text-xs text-gray-500">
                                配送费：{formatPrice(deliveryFee)}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={goToCheckout}
                        disabled={selectedItems.size === 0}
                        className={`px-6 py-2.5 rounded-full font-medium transition-colors ${
                            selectedItems.size > 0
                                ? 'bg-blue-500 text-white hover:bg-blue-600'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                    >
                        去结算 ({selectedItems.size})
                    </button>
                </div>
            </div>

            <Loading loading={loading} text="加载中..."/>
        </div>
    );
}

'use client';

import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import Image from 'next/image';
import {Calendar, CreditCard, Phone, Truck, User, Utensils} from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import Loading from '@/components/Loading';
import {orderApi} from '@/lib/api/order';
import {useCartStore} from '@/stores/cart';
import {formatPrice, getImageUrl} from '@/utils';

type OrderType = 'takeaway' | 'dine_in' | 'delivery';
type PaymentMethod = 'wechat' | 'alipay' | 'cash';

interface Table {
    id: number;
    table_number: string;
    table_name: string;
    status: 'available' | 'occupied' | 'reserved' | 'cleaning';
    status_text: string;
}

export default function OrderCreatePage() {
    const router = useRouter();
    const cartStore = useCartStore();

    const [loading, setLoading] = useState(false);
    const [orderType, setOrderType] = useState<OrderType>('takeaway');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('wechat');
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [pickupTime, setPickupTime] = useState('');
    const [tableNumber, setTableNumber] = useState('');
    const [availableTables, setAvailableTables] = useState<Table[]>([]);
    const [cartItems, setCartItems] = useState<any[]>([]);

    // 加载购物车数据
    useEffect(() => {
        loadCartData();
    }, []);

    // 监听订单类型变化
    useEffect(() => {
        if (orderType === 'dine_in') {
            loadAvailableTables();
        }
    }, [orderType]);

    const loadCartData = async () => {
        try {
            if (cartStore.cartItems.length === 0) {
                await cartStore.getCart();
            }

            const items = cartStore.cartItems.map(item => ({
                id: item.id,
                product_name: item.product.name,
                product_image: item.product.main_image,
                sku_name: item.sku?.specifications ? Object.values(item.sku.specifications).join(' ') : '',
                price: item.unit_price,
                quantity: item.quantity,
                product_id: item.product.id,
                sku_id: item.sku?.id
            }));

            setCartItems(items);

            if (items.length === 0) {
                alert('购物车为空，请先添加商品');
                router.push('/home');
            }
        } catch (error) {
            console.error('获取购物车数据失败:', error);
        }
    };

    const loadAvailableTables = async () => {
        try {
            // TODO: 调用桌台 API
            setAvailableTables([
                {id: 1, table_number: 'A1', table_name: '1 号桌', status: 'available', status_text: '空闲'},
                {id: 2, table_number: 'A2', table_name: '2 号桌', status: 'occupied', status_text: '占用'},
                {id: 3, table_number: 'B1', table_name: '3 号桌', status: 'available', status_text: '空闲'}
            ]);
        } catch (error) {
            console.error('加载桌台失败:', error);
        }
    };

    const totalAmount = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    const deliveryFee = orderType === 'delivery' ? 500 : 0;
    const finalTotal = totalAmount + deliveryFee;

    const handleSubmit = async () => {
        // 验证表单
        if (!customerName || customerName.trim().length < 2) {
            alert('请输入顾客姓名（至少 2 个字符）');
            return;
        }

        if (!customerPhone || customerPhone.length !== 11) {
            alert('请输入正确的联系电话');
            return;
        }

        if (orderType === 'dine_in' && !tableNumber) {
            alert('请选择桌台号');
            return;
        }

        if (orderType === 'takeaway' && !pickupTime) {
            alert('请选择取餐时间');
            return;
        }

        setLoading(true);
        try {
            const orderData: any = {
                order_type: orderType,
                customer_name: customerName,
                customer_phone: customerPhone,
                payment_method: paymentMethod,
                cart_id: cartStore.cartInfo?.id
            };

            if (orderType === 'dine_in') {
                orderData.table_number = tableNumber;
            }

            if (orderType === 'takeaway' && pickupTime) {
                orderData.pickup_time = new Date(pickupTime).toISOString();
            }

            const response = await orderApi.createOrder(orderData);
            alert('订单创建成功！');

            // 清空购物车
            await cartStore.clearCart();

            // 根据支付方式决定跳转
            if (['wechat', 'alipay'].includes(paymentMethod)) {
                router.push(`/order/${response.data.id}/pay?method=${paymentMethod}`);
            } else {
                router.push(`/order/${response.data.id}`);
            }
        } catch (error: any) {
            console.error('创建订单失败:', error);
            alert(error.response?.data?.message || '创建订单失败，请重试');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-32">
            <AppHeader title="确认订单"/>

            {/* 取餐信息 */}
            <div className="bg-white m-3 mt-3 rounded-xl p-4 space-y-4">
                <h2 className="text-base font-semibold mb-3">取餐信息</h2>

                {/* 订单类型 */}
                <div>
                    <label className="text-sm text-gray-600 mb-2 block">订单类型</label>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setOrderType('takeaway')}
                            className={`flex-1 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                                orderType === 'takeaway'
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            <Truck className="w-4 h-4"/>
                            <span>外卖</span>
                        </button>
                        <button
                            onClick={() => setOrderType('dine_in')}
                            className={`flex-1 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                                orderType === 'dine_in'
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            <Utensils className="w-4 h-4"/>
                            <span>堂食</span>
                        </button>
                    </div>
                </div>

                {/* 桌台选择 */}
                {orderType === 'dine_in' && (
                    <div>
                        <label className="text-sm text-gray-600 mb-2 block">桌台号</label>
                        <select
                            value={tableNumber}
                            onChange={(e) => setTableNumber(e.target.value)}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                        >
                            <option value="">请选择桌台</option>
                            {availableTables.map((table) => (
                                <option key={table.id} value={table.table_number}
                                        disabled={table.status !== 'available'}>
                                    {table.table_number} - {table.table_name} ({table.status_text})
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* 支付方式 */}
                <div>
                    <label className="text-sm text-gray-600 mb-2 block">支付方式</label>
                    <div className="space-y-2">
                        <label
                            className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                            <input
                                type="radio"
                                name="payment"
                                value="wechat"
                                checked={paymentMethod === 'wechat'}
                                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                                className="w-4 h-4 text-blue-500"
                            />
                            <CreditCard className="w-5 h-5 text-green-500"/>
                            <span className="flex-1">微信支付</span>
                        </label>
                        <label
                            className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                            <input
                                type="radio"
                                name="payment"
                                value="alipay"
                                checked={paymentMethod === 'alipay'}
                                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                                className="w-4 h-4 text-blue-500"
                            />
                            <CreditCard className="w-5 h-5 text-blue-500"/>
                            <span className="flex-1">支付宝</span>
                        </label>
                        <label
                            className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                            <input
                                type="radio"
                                name="payment"
                                value="cash"
                                checked={paymentMethod === 'cash'}
                                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                                className="w-4 h-4 text-blue-500"
                            />
                            <span className="flex-1">现金支付</span>
                        </label>
                    </div>
                </div>

                {/* 顾客姓名 */}
                <div>
                    <label className="text-sm text-gray-600 mb-2 block">顾客姓名</label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/>
                        <input
                            type="text"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="请输入顾客姓名"
                            maxLength={20}
                            className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                        />
                    </div>
                </div>

                {/* 联系电话 */}
                <div>
                    <label className="text-sm text-gray-600 mb-2 block">联系电话</label>
                    <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/>
                        <input
                            type="tel"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            placeholder="请输入联系电话"
                            maxLength={11}
                            className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                        />
                    </div>
                </div>

                {/* 取餐时间 */}
                {orderType === 'takeaway' && (
                    <div>
                        <label className="text-sm text-gray-600 mb-2 block">取餐时间</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/>
                            <input
                                type="datetime-local"
                                value={pickupTime}
                                onChange={(e) => setPickupTime(e.target.value)}
                                className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* 商品清单 */}
            <div className="bg-white m-3 rounded-xl p-4">
                <h2 className="text-base font-semibold mb-3">商品清单</h2>
                <div className="space-y-3">
                    {cartItems.map((item) => (
                        <div key={item.id} className="flex gap-3">
                            <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 relative">
                                {item.product_image ? (
                                    <Image
                                        src={getImageUrl(item.product_image)}
                                        alt={item.product_name}
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
                                <h4 className="font-medium text-sm truncate mb-1">{item.product_name}</h4>
                                {item.sku_name && (
                                    <p className="text-xs text-gray-500 mb-1">{item.sku_name}</p>
                                )}
                                <div className="flex items-center justify-between">
                                    <div className="text-red-500 font-medium text-sm">
                                        {formatPrice(item.price)}
                                    </div>
                                    <div className="text-gray-500 text-xs">×{item.quantity}</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-red-500 font-medium text-sm">
                                    {formatPrice(item.price * item.quantity)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 订单汇总 */}
            <div className="bg-white m-3 rounded-xl p-4">
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-500">商品总额</span>
                        <span className="text-gray-900">{formatPrice(totalAmount)}</span>
                    </div>
                    {deliveryFee > 0 && (
                        <div className="flex justify-between">
                            <span className="text-gray-500">配送费</span>
                            <span className="text-gray-900">{formatPrice(deliveryFee)}</span>
                        </div>
                    )}
                    <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between font-bold text-base">
                        <span className="text-gray-900">实付金额</span>
                        <span className="text-red-500 text-lg">{formatPrice(finalTotal)}</span>
                    </div>
                </div>
            </div>

            {/* 底部操作栏 */}
            <div
                className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 safe-area-bottom md:max-w-md md:left-1/2 md:-translate-x-1/2">
                <div className="flex items-center gap-3">
                    <div className="flex-1">
                        <div className="text-sm text-gray-500">合计</div>
                        <div className="text-xl font-bold text-red-500">{formatPrice(finalTotal)}</div>
                    </div>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-8 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px]"
                    >
                        {loading ? '创建中...' : '提交订单'}
                    </button>
                </div>
            </div>

            <Loading loading={false}/>
        </div>
    );
}

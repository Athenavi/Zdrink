'use client';

import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {Minus, Plus, RefreshCw, Search, Trash2} from 'lucide-react';
import {posApi} from '@/lib/api/pos';
import {orderApi} from '@/lib/api/order';

interface CartItem {
    product_id?: number;
    name: string;
    price: number;
    quantity: number;
    image?: string;
    sku?: string;
}

interface OrderForm {
    order_type: 'dine_in' | 'takeaway' | 'delivery';
    table_number: string;
    customer_name: string;
    customer_phone: string;
    payment_method: 'cash' | 'wechat' | 'alipay' | 'card';
    remark: string;
}

interface RecentOrder {
    id: number;
    order_no: string;
    customer_name: string;
    total_amount: string;
    status: string;
}

interface Table {
    id: number;
    table_number: string;
    table_name: string;
}

export default function POSCheckoutPage() {
    const router = useRouter();
    const [barcode, setBarcode] = useState('');
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [discountAmount, setDiscountAmount] = useState(0);
    const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
    const [availableTables, setAvailableTables] = useState<Table[]>([]);

    const [orderForm, setOrderForm] = useState<OrderForm>({
        order_type: 'dine_in',
        table_number: '',
        customer_name: '',
        customer_phone: '',
        payment_method: 'cash',
        remark: ''
    });

    // 计算属性
    const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const deliveryFee = orderForm.order_type === 'delivery' ? 5 : 0;
    const finalAmount = totalAmount - discountAmount + deliveryFee;

    useEffect(() => {
        loadAvailableTables();
        loadRecentOrders();
    }, []);

    const loadAvailableTables = async () => {
        try {
            const response = await posApi.getAvailableTables();
            setAvailableTables(response.data || []);
        } catch (error) {
            console.error('加载桌台失败:', error);
        }
    };

    const loadRecentOrders = async () => {
        try {
            const response = await orderApi.getOrders({page: 1, page_size: 5});
            setRecentOrders((response.data as any).results || response.data || []);
        } catch (error) {
            console.error('加载订单失败:', error);
        }
    };

    const handleScanBarcode = async () => {
        if (!barcode || !barcode.trim()) {
            alert('请输入商品条码');
            return;
        }

        try {
            const response = await posApi.scanBarcode({barcode});
            const data = response.data;

            if (data.type === 'product') {
                setCartItems(prev => [...prev, {
                    name: data.data.name || `商品${barcode}`,
                    price: parseFloat(data.data.price || 0),
                    quantity: 1,
                    image: data.data.image || '/images/product-placeholder.jpg',
                    product_id: data.data.id
                }]);
                alert('商品已添加');
            } else if (data.type === 'member') {
                alert(`会员姓名：${data.data.name}\n积分：${data.data.points}`);
            }

            setBarcode('');
        } catch (error: any) {
            console.error('扫描失败:', error);

            // 如果是 404，允许手动输入商品信息
            const manualInput = prompt('未找到对应商品，请手动输入商品信息\n格式：商品名称，价格', '手动商品，0');
            if (manualInput) {
                const [name, price] = manualInput.split(',');
                setCartItems(prev => [...prev, {
                    name: name.trim(),
                    price: parseFloat(price.trim()) || 0,
                    quantity: 1
                }]);
                alert('商品已添加');
            }
        }
    };

    const updateQuantity = (index: number, quantity: number) => {
        const newItems = [...cartItems];
        newItems[index].quantity = quantity;
        setCartItems(newItems);
    };

    const removeItem = (index: number) => {
        setCartItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleApplyDiscount = () => {
        const value = prompt('请输入折扣金额');
        if (value && /^\d+(\.\d{1,2})?$/.test(value)) {
            setDiscountAmount(parseFloat(value));
            alert('折扣已应用');
        } else if (value) {
            alert('请输入有效金额');
        }
    };

    const handleClearCart = () => {
        if (confirm('确定要清空购物车吗？')) {
            setCartItems([]);
            setDiscountAmount(0);
            alert('已清空');
        }
    };

    const handleSubmitOrder = async () => {
        // 验证表单
        if (!orderForm.customer_name || !orderForm.customer_name.trim() || orderForm.customer_name.trim().length < 2) {
            alert('请输入顾客姓名（至少 2 个字符）');
            return;
        }

        if (!orderForm.customer_phone || !/^1[3-9]\d{9}$/.test(orderForm.customer_phone)) {
            alert('请输入正确的手机号码');
            return;
        }

        if (cartItems.length === 0) {
            alert('购物车为空');
            return;
        }

        setSubmitting(true);

        try {
            const orderData: any = {
                order_type: orderForm.order_type,
                customer_name: orderForm.customer_name,
                customer_phone: orderForm.customer_phone,
                payment_method: orderForm.payment_method,
                items: cartItems.map(item => ({
                    product_id: item.product_id || 0,
                    quantity: item.quantity,
                    unit_price: item.price
                }))
            };

            if (orderForm.order_type === 'dine_in' && orderForm.table_number) {
                orderData.table_number = orderForm.table_number;
            }

            const response = await posApi.quickOrder(orderData);
            alert('订单创建成功！');

            // 清空表单和购物车
            setCartItems([]);
            setDiscountAmount(0);
            setOrderForm(prev => ({
                ...prev,
                customer_name: '',
                customer_phone: '',
                remark: ''
            }));

            // 刷新最近订单
            await loadRecentOrders();

            // 询问是否打印
            if (confirm('是否需要打印订单？')) {
                // TODO: 调用打印 API
                alert('打印功能开发中');
            }
        } catch (error: any) {
            console.error('创建订单失败:', error);
            alert(error.response?.data?.message || '创建订单失败');
        } finally {
            setSubmitting(false);
        }
    };

    const viewOrder = (orderId: number) => {
        router.push(`/order/${orderId}`);
    };

    const getOrderStatusType = (status: string) => {
        const typeMap: Record<string, string> = {
            pending: 'warning',
            confirmed: 'primary',
            completed: 'success',
            cancelled: 'info'
        };
        return typeMap[status] || 'info';
    };

    const getOrderStatusText = (status: string) => {
        const textMap: Record<string, string> = {
            pending: '待确认',
            confirmed: '已确认',
            completed: '已完成',
            cancelled: '已取消'
        };
        return textMap[status] || status;
    };

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            {/* 头部 */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800 mb-2">POS 收银台</h1>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <button onClick={() => router.push('/home')} className="hover:text-blue-500">首页</button>
                    <span>/</span>
                    <span>收银台</span>
                </div>
            </div>

            {/* 主体内容 */}
            <div className="grid grid-cols-3 gap-6 max-w-[1400px] mx-auto">
                {/* 左侧：商品录入区 */}
                <div className="col-span-2 bg-white rounded-xl shadow-md p-6">
                    {/* 扫码枪输入 */}
                    <div className="mb-6">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={barcode}
                                onChange={(e) => setBarcode(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleScanBarcode()}
                                placeholder="扫描商品条码或手动输入"
                                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                            />
                            <button
                                onClick={handleScanBarcode}
                                className="px-6 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                            >
                                <Search className="w-5 h-5"/>
                                <span>扫描</span>
                            </button>
                        </div>
                    </div>

                    {/* 已选商品列表 */}
                    <div className="mb-6">
                        <div className="text-lg font-semibold mb-4">已选商品</div>

                        {cartItems.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">
                                <p>请扫描或添加商品</p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[400px] overflow-y-auto">
                                {cartItems.map((item, index) => (
                                    <div key={index}
                                         className="flex items-center justify-between pb-3 border-b border-gray-100 last:border-0">
                                        <div className="flex items-center gap-4 flex-1">
                                            <img
                                                src={item.image || '/images/product-placeholder.jpg'}
                                                alt={item.name}
                                                className="w-16 h-16 rounded-lg object-cover"
                                            />
                                            <div className="flex-1">
                                                <div className="font-medium">{item.name}</div>
                                                {item.sku &&
                                                    <div className="text-xs text-gray-500 mt-1">{item.sku}</div>}
                                                <div
                                                    className="text-red-500 font-semibold mt-1">¥{item.price.toFixed(2)}</div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => updateQuantity(index, Math.max(1, item.quantity || 1))}
                                                    className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50"
                                                >
                                                    <Minus className="w-4 h-4"/>
                                                </button>
                                                <input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={(e) => updateQuantity(index, parseInt(e.target.value) || 1)}
                                                    min="1"
                                                    max="99"
                                                    className="w-16 text-center border border-gray-300 rounded py-1.5"
                                                />
                                                <button
                                                    onClick={() => updateQuantity(index, Math.min(99, (item.quantity || 0) + 1))}
                                                    className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50"
                                                >
                                                    <Plus className="w-4 h-4"/>
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => removeItem(index)}
                                                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm flex items-center gap-1"
                                            >
                                                <Trash2 className="w-4 h-4"/>
                                                <span>删除</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 快速下单表单 */}
                    <div className="border-t pt-6">
                        <div className="space-y-4">
                            {/* 订单类型 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">订单类型</label>
                                <div className="flex gap-4">
                                    {[
                                        {value: 'dine_in', label: '堂食'},
                                        {value: 'takeaway', label: '外带'},
                                        {value: 'delivery', label: '外卖'}
                                    ].map((option) => (
                                        <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                checked={orderForm.order_type === option.value}
                                                onChange={() => setOrderForm(prev => ({
                                                    ...prev,
                                                    order_type: option.value as any
                                                }))}
                                                className="w-4 h-4 text-blue-500"
                                            />
                                            <span>{option.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* 桌台号 */}
                            {orderForm.order_type === 'dine_in' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">桌台号</label>
                                    <select
                                        value={orderForm.table_number}
                                        onChange={(e) => setOrderForm(prev => ({
                                            ...prev,
                                            table_number: e.target.value
                                        }))}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                                    >
                                        <option value="">选择桌台</option>
                                        {availableTables.map((table) => (
                                            <option key={table.id} value={table.table_number}>
                                                {table.table_number} ({table.table_name})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* 顾客姓名 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">顾客姓名</label>
                                <input
                                    type="text"
                                    value={orderForm.customer_name}
                                    onChange={(e) => setOrderForm(prev => ({...prev, customer_name: e.target.value}))}
                                    maxLength={20}
                                    placeholder="请输入顾客姓名"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            {/* 联系电话 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">联系电话</label>
                                <input
                                    type="tel"
                                    value={orderForm.customer_phone}
                                    onChange={(e) => setOrderForm(prev => ({...prev, customer_phone: e.target.value}))}
                                    maxLength={11}
                                    placeholder="请输入联系电话"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            {/* 支付方式 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">支付方式</label>
                                <div className="flex gap-4 flex-wrap">
                                    {[
                                        {value: 'cash', label: '现金'},
                                        {value: 'wechat', label: '微信'},
                                        {value: 'alipay', label: '支付宝'},
                                        {value: 'card', label: '银行卡'}
                                    ].map((option) => (
                                        <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                checked={orderForm.payment_method === option.value}
                                                onChange={() => setOrderForm(prev => ({
                                                    ...prev,
                                                    payment_method: option.value as any
                                                }))}
                                                className="w-4 h-4 text-blue-500"
                                            />
                                            <span>{option.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* 备注 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">备注</label>
                                <textarea
                                    value={orderForm.remark}
                                    onChange={(e) => setOrderForm(prev => ({...prev, remark: e.target.value}))}
                                    rows={2}
                                    placeholder="选填备注信息"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 resize-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 右侧：结算区 */}
                <div className="space-y-6">
                    {/* 订单汇总 */}
                    <div className="bg-white rounded-xl shadow-md p-6">
                        <h3 className="text-lg font-semibold mb-4">订单汇总</h3>

                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-gray-600">商品数量:</span>
                                <span className="font-medium">{totalQuantity}件</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">商品总额:</span>
                                <span className="font-semibold">¥{totalAmount.toFixed(2)}</span>
                            </div>
                            {discountAmount > 0 && (
                                <div className="flex justify-between text-green-600">
                                    <span>优惠金额:</span>
                                    <span className="font-semibold">-¥{discountAmount.toFixed(2)}</span>
                                </div>
                            )}
                            {deliveryFee > 0 && (
                                <div className="flex justify-between">
                                    <span>配送费:</span>
                                    <span className="font-semibold">¥{deliveryFee.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="border-t pt-3">
                                <div className="flex justify-between text-lg font-bold">
                                    <span>实收金额:</span>
                                    <span className="text-red-600 text-xl">¥{finalAmount.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* 快捷操作 */}
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={handleApplyDiscount}
                                disabled={cartItems.length === 0}
                                className="flex-1 py-2.5 border border-blue-500 text-blue-500 rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                应用折扣
                            </button>
                            <button
                                onClick={handleClearCart}
                                disabled={cartItems.length === 0}
                                className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                清空
                            </button>
                        </div>

                        {/* 提交订单按钮 */}
                        <button
                            onClick={handleSubmitOrder}
                            disabled={cartItems.length === 0 || submitting}
                            className="w-full mt-4 py-3.5 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {submitting ? '提交中...' : '提交订单'}
                        </button>
                    </div>

                    {/* 最近订单 */}
                    <div className="bg-white rounded-xl shadow-md p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">最近订单</h3>
                            <button onClick={loadRecentOrders} className="text-gray-400 hover:text-blue-500">
                                <RefreshCw className="w-5 h-5"/>
                            </button>
                        </div>

                        <div className="space-y-3 max-h-[300px] overflow-y-auto">
                            {recentOrders.length === 0 ? (
                                <div className="text-center py-8 text-gray-400">暂无订单</div>
                            ) : (
                                recentOrders.map((order) => (
                                    <div
                                        key={order.id}
                                        onClick={() => viewOrder(order.id)}
                                        className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-medium text-sm">{order.order_no}</span>
                                            <span className={`px-2 py-0.5 text-xs rounded ${
                                                order.status === 'completed' ? 'bg-green-100 text-green-600' :
                                                    order.status === 'pending' ? 'bg-orange-100 text-orange-600' :
                                                        'bg-gray-100 text-gray-600'
                                            }`}>
                        {getOrderStatusText(order.status)}
                      </span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm text-gray-600">
                                            <span>{order.customer_name}</span>
                                            <span className="text-red-500 font-medium">¥{order.total_amount}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

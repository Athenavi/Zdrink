'use client';

import {useEffect, useState} from 'react';
import {useParams, useRouter, useSearchParams} from 'next/navigation';
import Image from 'next/image';
import {CheckCircle, Copy, QrCode} from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import Loading from '@/components/Loading';
import {orderApi} from '@/lib/api/order';
import {formatPrice, getImageUrl} from '@/utils';
import {Order} from '@/types';

type PaymentMethod = 'wechat' | 'alipay' | 'cash';

interface PaymentData {
    transaction_id: number;
    transaction_no: string;
    payment_data: {
        payment_type?: string;
        code_url?: string;
        qr_code?: string;
        pay_url?: string;
        order_string?: string;
    };
}

export default function OrderPayPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const orderId = params.orderId as string;
    const methodParam = searchParams.get('method') as PaymentMethod || 'wechat';

    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(methodParam);
    const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
    const [creating, setCreating] = useState(false);
    const [pollingTimer, setPollingTimer] = useState<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (orderId) {
            loadOrderDetail();
        }
        return () => {
            // 清理轮询定时器
            if (pollingTimer) {
                clearInterval(pollingTimer);
            }
        };
    }, [orderId]);

    const loadOrderDetail = async () => {
        setLoading(true);
        try {
            const response = await orderApi.getOrder(parseInt(orderId));
            setOrder(response.data);

            // 如果订单已支付，跳转到订单详情
            if (response.data.payment_status === 'paid') {
                router.replace(`/order/${orderId}`);
                return;
            }
        } catch (error) {
            console.error('获取订单详情失败:', error);
            alert('获取订单详情失败');
        } finally {
            setLoading(false);
        }
    };

    const createPayment = async () => {
        if (!order) return;

        setCreating(true);
        try {
            const response = await orderApi.createPayment({
                order_id: parseInt(orderId),
                payment_method: paymentMethod
            });

            setPaymentData(response.data);

            // 开始轮询支付状态
            startPolling(response.data.transaction_id);

            // 如果是支付宝WAP/PC支付，直接跳转
            if (response.data.payment_data.pay_url) {
                window.location.href = response.data.payment_data.pay_url;
            }

        } catch (error: any) {
            console.error('创建支付失败:', error);
            const errorMsg = error.response?.data?.error ||
                error.response?.data?.detail ||
                error.response?.data?.message ||
                JSON.stringify(error.response?.data) ||
                '创建支付失败，请重试';
            console.error('错误详情:', errorMsg);
            alert(errorMsg);
        } finally {
            setCreating(false);
        }
    };

    const startPolling = (transactionId: number) => {
        // 清除之前的定时器
        if (pollingTimer) {
            clearInterval(pollingTimer);
        }

        // 每3秒查询一次支付状态
        const timer = setInterval(async () => {
            try {
                const response = await orderApi.getOrder(parseInt(orderId));
                if (response.data.payment_status === 'paid') {
                    // 支付成功，停止轮询
                    clearInterval(timer);
                    setPollingTimer(null);

                    // 显示成功提示后跳转
                    setTimeout(() => {
                        alert('支付成功！');
                        router.push(`/order/${orderId}`);
                    }, 500);
                }
            } catch (error) {
                console.error('查询支付状态失败:', error);
            }
        }, 3000);

        setPollingTimer(timer);

        // 5分钟后停止轮询
        setTimeout(() => {
            if (timer) {
                clearInterval(timer);
                setPollingTimer(null);
            }
        }, 300000);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            alert('已复制到剪贴板');
        });
    };

    const getMethodName = (method: PaymentMethod) => {
        const names: Record<PaymentMethod, string> = {
            wechat: '微信支付',
            alipay: '支付宝',
            cash: '现金支付'
        };
        return names[method];
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <AppHeader title="订单支付"/>
                <Loading loading={true} text="加载中..."/>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <AppHeader title="订单支付"/>
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center text-gray-500">订单不存在</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <AppHeader title="订单支付"/>

            {/* 订单信息 */}
            <div className="bg-white p-4">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-500">订单号</span>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{order.order_number}</span>
                        <button
                            onClick={() => copyToClipboard(order.order_number)}
                            className="text-blue-500 hover:text-blue-600"
                        >
                            <Copy className="w-4 h-4"/>
                        </button>
                    </div>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">应付金额</span>
                    <span className="text-2xl font-bold text-red-500">
                        {formatPrice(order.total_amount)}
                    </span>
                </div>
            </div>

            {/* 支付方式选择 */}
            {!paymentData && (
                <div className="bg-white mt-3 p-4">
                    <div className="text-sm font-medium mb-3">选择支付方式</div>
                    <div className="space-y-2">
                        <label
                            className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                paymentMethod === 'wechat'
                                    ? 'border-green-500 bg-green-50'
                                    : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <input
                                type="radio"
                                name="payment"
                                value="wechat"
                                checked={paymentMethod === 'wechat'}
                                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                                className="w-5 h-5 text-green-500"
                            />
                            <div className="flex-1">
                                <div className="font-medium">微信支付</div>
                                <div className="text-xs text-gray-500 mt-1">推荐使用，安全便捷</div>
                            </div>
                            <QrCode className="w-6 h-6 text-green-500"/>
                        </label>

                        <label
                            className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                paymentMethod === 'alipay'
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <input
                                type="radio"
                                name="payment"
                                value="alipay"
                                checked={paymentMethod === 'alipay'}
                                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                                className="w-5 h-5 text-blue-500"
                            />
                            <div className="flex-1">
                                <div className="font-medium">支付宝</div>
                                <div className="text-xs text-gray-500 mt-1">亿万用户的选择</div>
                            </div>
                            <QrCode className="w-6 h-6 text-blue-500"/>
                        </label>

                        <label
                            className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                paymentMethod === 'cash'
                                    ? 'border-orange-500 bg-orange-50'
                                    : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <input
                                type="radio"
                                name="payment"
                                value="cash"
                                checked={paymentMethod === 'cash'}
                                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                                className="w-5 h-5 text-orange-500"
                            />
                            <div className="flex-1">
                                <div className="font-medium">现金支付</div>
                                <div className="text-xs text-gray-500 mt-1">到店付款</div>
                            </div>
                        </label>
                    </div>

                    <button
                        onClick={createPayment}
                        disabled={creating}
                        className="w-full mt-4 py-3.5 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {creating ? '创建支付中...' : `确认支付 ${formatPrice(order.total_amount)}`}
                    </button>
                </div>
            )}

            {/* 支付二维码/指引 */}
            {paymentData && (
                <div className="bg-white mt-3 p-6">
                    {paymentData.payment_data.payment_type === 'native' && paymentData.payment_data.qr_code && (
                        <div className="text-center">
                            <div className="text-lg font-medium mb-2">请使用{getMethodName(paymentMethod)}扫码</div>
                            <div
                                className="text-sm text-gray-500 mb-4">打开{getMethodName(paymentMethod)}扫一扫完成支付
                            </div>

                            <div className="inline-block p-4 bg-white border-2 border-gray-200 rounded-xl">
                                <Image
                                    src={paymentData.payment_data.qr_code}
                                    alt="支付二维码"
                                    width={250}
                                    height={250}
                                    className="rounded-lg"
                                />
                            </div>

                            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"/>
                                <span>等待支付...</span>
                            </div>

                            <div className="mt-4 text-xs text-gray-400">
                                交易号：{paymentData.transaction_no}
                            </div>
                        </div>
                    )}

                    {paymentData.payment_data.payment_type === 'app' && paymentData.payment_data.order_string && (
                        <div className="text-center">
                            <div className="text-lg font-medium mb-2">请在APP中完成支付</div>
                            <div className="text-sm text-gray-500 mb-4">订单信息已生成，请在支付宝APP中查看</div>

                            <div className="p-4 bg-gray-50 rounded-lg text-left text-xs break-all">
                                <div className="font-medium mb-2">订单字符串：</div>
                                <div
                                    className="text-gray-600">{paymentData.payment_data.order_string.substring(0, 100)}...
                                </div>
                            </div>

                            <button
                                onClick={() => copyToClipboard(paymentData.payment_data.order_string)}
                                className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                            >
                                复制订单信息
                            </button>
                        </div>
                    )}

                    {paymentMethod === 'cash' && (
                        <div className="text-center">
                            <CheckCircle className="w-16 h-16 text-orange-500 mx-auto mb-4"/>
                            <div className="text-lg font-medium mb-2">现金支付</div>
                            <div className="text-sm text-gray-500 mb-4">
                                请向店员出示订单号，完成现金支付
                            </div>

                            <div className="p-4 bg-orange-50 rounded-lg">
                                <div className="text-sm text-gray-600 mb-1">订单号</div>
                                <div className="text-xl font-bold text-orange-600">{order.order_number}</div>
                            </div>

                            <button
                                onClick={() => router.push(`/order/${orderId}`)}
                                className="mt-6 px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                            >
                                我已支付，返回订单
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* 商品清单 */}
            <div className="bg-white mt-3 p-4">
                <div className="text-sm font-medium mb-3">商品清单</div>
                <div className="space-y-3">
                    {order.items?.map((item, index) => (
                        <div key={index} className="flex gap-3">
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
                                <h4 className="font-medium text-sm mb-1 truncate">{item.product_name}</h4>
                                <div className="flex items-center justify-between">
                                    <div className="text-red-500 font-medium text-sm">
                                        {formatPrice(item.unit_price)}
                                    </div>
                                    <div className="text-gray-500 text-xs">×{item.quantity}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <Loading loading={false}/>
        </div>
    );
}

'use client';

import {useEffect, useState} from 'react';
import {useParams, useRouter} from 'next/navigation';
import Image from 'next/image';
import {CheckCircle, Clock, MapPin, Package, Phone, Utensils, XCircle} from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import Loading from '@/components/Loading';
import {orderApi} from '@/lib/api/order';
import {formatPrice, getImageUrl} from '@/utils';
import {Order} from '@/types';

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    pending: {label: '待确认', color: 'text-orange-500', bg: 'bg-orange-50', icon: Clock},
    confirmed: {label: '已确认', color: 'text-blue-500', bg: 'bg-blue-50', icon: CheckCircle},
    preparing: {label: '制作中', color: 'text-purple-500', bg: 'bg-purple-50', icon: Utensils},
    completed: {label: '已完成', color: 'text-green-500', bg: 'bg-green-50', icon: Package},
    cancelled: {label: '已取消', color: 'text-gray-500', bg: 'bg-gray-50', icon: XCircle}
};

export default function OrderDetailPage() {
    const router = useRouter();
    const params = useParams();
    const orderId = params.orderId as string;

    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (orderId) {
            loadOrderDetail();
        }
    }, [orderId]);

    const loadOrderDetail = async () => {
        setLoading(true);
        try {
            const response = await orderApi.getOrder(parseInt(orderId));
            setOrder(response.data);
        } catch (error) {
            console.error('获取订单详情失败:', error);
            alert('获取订单详情失败');
        } finally {
            setLoading(false);
        }
    };

    const cancelOrder = async () => {
        if (!confirm('确定要取消该订单吗？')) {
            return;
        }

        try {
            await orderApi.cancelOrder(parseInt(orderId), {reason: '用户主动取消'});
            alert('订单已取消');
            loadOrderDetail();
        } catch (error) {
            console.error('取消订单失败:', error);
            alert('取消订单失败');
        }
    };

    const payOrder = () => {
        alert('支付功能开发中...');
    };

    const confirmReceive = async () => {
        if (!confirm('确认已经收到商品？')) {
            return;
        }

        try {
            // TODO: 调用确认收货 API
            alert('确认收货成功');
            loadOrderDetail();
        } catch (error) {
            console.error('确认收货失败:', error);
        }
    };

    const contactShop = () => {
        alert('联系商家功能开发中');
    };

    const getStatusConfig = (status: string) => {
        return statusConfig[status] || {label: status, color: 'text-gray-500', bg: 'bg-gray-50', icon: Clock};
    };

    const getDeliveryTypeText = (type?: string) => {
        if (!type) return '';
        const typeMap: Record<string, string> = {
            delivery: '外卖配送',
            pickup: '到店自取',
            dine_in: '堂食'
        };
        return typeMap[type] || type;
    };

    const getPaymentStatusText = (status: string) => {
        const statusMap: Record<string, string> = {
            unpaid: '未支付',
            paid: '已支付',
            refunded: '已退款'
        };
        return statusMap[status] || status;
    };

    const showActionBar = order && ['pending', 'paid', 'confirmed', 'preparing'].includes(order.status);
    const canCancel = order && ['pending', 'paid'].includes(order.status);
    const canPay = order?.status === 'pending' && order.payment_status === 'unpaid';
    const canConfirmReceive = order && ['preparing', 'delivered'].includes(order.status);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <AppHeader title="订单详情"/>
                <Loading loading={true} text="加载中..."/>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <AppHeader title="订单详情"/>
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center text-gray-500">订单不存在</div>
                </div>
            </div>
        );
    }

    const statusCfg = getStatusConfig(order.status);
    const StatusIcon = statusCfg.icon;

    return (
        <div className="min-h-screen bg-gray-50 pb-32">
            <AppHeader title="订单详情"/>

            {/* 订单状态卡片 */}
            <div className={`${statusCfg.bg} p-4`}>
                <div className="flex items-center gap-3">
                    <StatusIcon className={`w-8 h-8 ${statusCfg.color}`}/>
                    <div className="flex-1">
                        <div className={`text-lg font-bold ${statusCfg.color}`}>{statusCfg.label}</div>
                        <div className="text-sm text-gray-600 mt-1">订单号：{order.order_number}</div>
                    </div>
                </div>
            </div>

            {/* 配送信息 */}
            {order.delivery_info && (
                <div className="bg-white mt-3 p-4 space-y-3">
                    <div className="text-sm font-medium mb-2">配送信息</div>
                    <div className="flex items-start gap-3 text-sm">
                        <Utensils className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5"/>
                        <div>
                            <div className="text-gray-500">配送方式</div>
                            <div className="text-gray-900">{getDeliveryTypeText(order.delivery_type)}</div>
                        </div>
                    </div>

                    {order.delivery_address && (
                        <div className="flex items-start gap-3 text-sm">
                            <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5"/>
                            <div>
                                <div className="text-gray-500">配送地址</div>
                                <div className="text-gray-900">
                                    {order.delivery_address.province}{order.delivery_address.city}
                                    {order.delivery_address.district}{order.delivery_address.detail}
                                </div>
                            </div>
                        </div>
                    )}

                    {order.customer_phone && (
                        <div className="flex items-start gap-3 text-sm">
                            <Phone className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5"/>
                            <div>
                                <div className="text-gray-500">联系电话</div>
                                <div className="text-gray-900">{order.customer_phone}</div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* 商品列表 */}
            <div className="bg-white mt-3 p-4">
                <div className="text-sm font-medium mb-3">商品信息</div>
                <div className="space-y-3">
                    {order.items?.map((item, index) => (
                        <div key={index} className="flex gap-3">
                            <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 relative">
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
                                <h4 className="font-medium text-base mb-1 truncate">{item.product_name}</h4>
                                {item.sku_specifications && (
                                    <p className="text-sm text-gray-500 mb-2">
                                        {Object.entries(item.sku_specifications)
                                            .map(([key, value]) => `${key}: ${value}`)
                                            .join(', ')}
                                    </p>
                                )}
                                <div className="flex items-center justify-between">
                                    <div className="text-red-500 font-medium">
                                        {formatPrice(item.unit_price)}
                                    </div>
                                    <div className="text-gray-500 text-sm">×{item.quantity}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 费用明细 */}
            <div className="bg-white mt-3 p-4">
                <div className="text-sm font-medium mb-3">订单金额</div>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-500">商品总额</span>
                        <span className="text-gray-900">{formatPrice(order.total_amount)}</span>
                    </div>
                    {order.discount_amount && (
                        <div className="flex justify-between">
                            <span className="text-gray-500">优惠金额</span>
                            <span className="text-red-500">-{formatPrice(order.discount_amount)}</span>
                        </div>
                    )}
                    {order.delivery_fee && (
                        <div className="flex justify-between">
                            <span className="text-gray-500">配送费</span>
                            <span className="text-gray-900">{formatPrice(order.delivery_fee)}</span>
                        </div>
                    )}
                    <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between font-bold text-base">
                        <span className="text-gray-900">实付款</span>
                        <span className="text-red-500">{formatPrice(order.paid_amount || order.total_amount)}</span>
                    </div>
                </div>
            </div>

            {/* 支付信息 */}
            {order.payment_status && (
                <div className="bg-white mt-3 p-4 space-y-2">
                    <div className="text-sm font-medium mb-2">支付信息</div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">支付状态</span>
                        <span className="text-gray-900">{getPaymentStatusText(order.payment_status)}</span>
                    </div>
                    {order.paid_at && (
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">支付时间</span>
                            <span className="text-gray-900">{new Date(order.paid_at).toLocaleString()}</span>
                        </div>
                    )}
                </div>
            )}

            {/* 订单备注 */}
            {order.remarks && (
                <div className="bg-white mt-3 p-4">
                    <div className="text-sm font-medium mb-2">订单备注</div>
                    <div className="text-sm text-gray-600">{order.remarks}</div>
                </div>
            )}

            {/* 时间信息 */}
            <div className="bg-white mt-3 p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-gray-500">下单时间</span>
                    <span className="text-gray-900">{new Date(order.created_at).toLocaleString()}</span>
                </div>
                {order.completed_at && (
                    <div className="flex justify-between">
                        <span className="text-gray-500">完成时间</span>
                        <span className="text-gray-900">{new Date(order.completed_at).toLocaleString()}</span>
                    </div>
                )}
            </div>

            {/* 底部操作栏 */}
            {showActionBar && (
                <div
                    className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 safe-area-bottom md:max-w-md md:left-1/2 md:-translate-x-1/2">
                    <div className="flex gap-2">
                        {canCancel && (
                            <button
                                onClick={cancelOrder}
                                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                            >
                                取消订单
                            </button>
                        )}
                        {canPay && (
                            <button
                                onClick={payOrder}
                                className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                            >
                                立即支付
                            </button>
                        )}
                        {canConfirmReceive && (
                            <button
                                onClick={confirmReceive}
                                className="flex-1 px-4 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
                            >
                                确认收货
                            </button>
                        )}
                        <button
                            onClick={contactShop}
                            className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                        >
                            联系商家
                        </button>
                    </div>
                </div>
            )}

            <Loading loading={false}/>
        </div>
    );
}

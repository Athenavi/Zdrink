'use client';

import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import Image from 'next/image';
import {CheckCircle, ChevronRight, Clock, Package, XCircle} from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import Loading from '@/components/Loading';
import {orderApi} from '@/lib/api/order';
import {formatPrice, getImageUrl} from '@/utils';
import {Order} from '@/types';

type OrderStatus = 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled';

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    pending: {label: '待确认', color: 'text-orange-500', icon: Clock},
    confirmed: {label: '已确认', color: 'text-blue-500', icon: CheckCircle},
    completed: {label: '已完成', color: 'text-green-500', icon: Package},
    cancelled: {label: '已取消', color: 'text-gray-500', icon: XCircle}
};

export default function OrdersPage() {
    const router = useRouter();

    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(false);
    const [filterStatus, setFilterStatus] = useState<OrderStatus>('all');
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [total, setTotal] = useState(0);

    // 获取订单列表
    const loadOrders = async () => {
        setLoading(true);
        try {
            const params: any = {
                page,
                page_size: pageSize
            };

            if (filterStatus !== 'all') {
                params.status = filterStatus;
            }

            const response = await orderApi.getOrders(params);
            const data = response.data as any;
            setOrders(data.results || data);
            setTotal(data.count || (data as Order[]).length);
        } catch (error) {
            console.error('获取订单列表失败:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOrders();
    }, [filterStatus, page]);

    // 取消订单
    const cancelOrder = async (orderId: number, event: React.MouseEvent) => {
        event.stopPropagation();

        if (!confirm('确定要取消这个订单吗？')) {
            return;
        }

        try {
            await orderApi.cancelOrder(orderId);
            alert('订单已取消');
            loadOrders();
        } catch (error) {
            console.error('取消订单失败:', error);
            alert('取消订单失败');
        }
    };

    // 支付订单
    const payOrder = async (orderId: number, event: React.MouseEvent) => {
        event.stopPropagation();
        alert('支付功能开发中...');
    };

    // 查看订单详情
    const viewOrderDetail = (orderId: number) => {
        router.push(`/order/${orderId}`);
    };

    const getStatusConfig = (status: string) => {
        return statusConfig[status] || {label: status, color: 'text-gray-500', icon: Clock};
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-4">
            <AppHeader title="我的订单"/>

            {/* 状态筛选 */}
            <div className="bg-white sticky top-0 z-10 shadow-sm">
                <div className="flex overflow-x-auto hide-scrollbar">
                    {[
                        {value: 'all', label: '全部'},
                        {value: 'pending', label: '待确认'},
                        {value: 'confirmed', label: '已确认'},
                        {value: 'completed', label: '已完成'},
                        {value: 'cancelled', label: '已取消'}
                    ].map((item) => (
                        <button
                            key={item.value}
                            onClick={() => {
                                setFilterStatus(item.value as OrderStatus);
                                setPage(1);
                            }}
                            className={`flex-shrink-0 px-4 py-3 font-medium text-sm transition-colors border-b-2 ${
                                filterStatus === item.value
                                    ? 'border-blue-500 text-blue-500'
                                    : 'border-transparent text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* 订单列表 */}
            <div className="p-3 space-y-3">
                {loading ? (
                    <Loading loading={true} text="加载中..."/>
                ) : orders.length === 0 ? (
                    <div className="bg-white rounded-xl p-8 text-center">
                        <div className="w-24 h-24 mx-auto mb-4 text-gray-300">
                            <Package className="w-full h-full"/>
                        </div>
                        <p className="text-gray-500">暂无订单</p>
                    </div>
                ) : (
                    orders.map((order) => {
                        const statusCfg = getStatusConfig(order.status);
                        const StatusIcon = statusCfg.icon;

                        return (
                            <div
                                key={order.id}
                                onClick={() => viewOrderDetail(order.id)}
                                className="bg-white rounded-xl p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                            >
                                {/* 订单头部 */}
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <div className="text-xs text-gray-500 mb-1">
                                            订单号：{order.order_number}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {new Date(order.created_at).toLocaleString()}
                                        </div>
                                    </div>
                                    <div className={`flex items-center gap-1 ${statusCfg.color}`}>
                                        <StatusIcon className="w-4 h-4"/>
                                        <span className="text-sm font-medium">{statusCfg.label}</span>
                                    </div>
                                </div>

                                {/* 商品列表 */}
                                <div className="space-y-2 mb-3">
                                    {(order.items || []).slice(0, 3).map((item, index) => (
                                        <div key={index} className="flex gap-3">
                                            <div
                                                className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 relative">
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
                                                <div className="text-xs text-gray-500">×{item.quantity}</div>
                                            </div>
                                            <div className="text-sm font-medium text-red-500">
                                                {formatPrice(item.price)}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* 订单底部 */}
                                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                    <div>
                                        <div className="text-xs text-gray-500">实付</div>
                                        <div className="text-lg font-bold text-red-500">
                                            {formatPrice(order.total_amount)}
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        {order.status === 'pending' && (
                                            <button
                                                onClick={(e) => cancelOrder(order.id, e)}
                                                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                            >
                                                取消订单
                                            </button>
                                        )}
                                        {order.status === 'confirmed' && (
                                            <button
                                                onClick={(e) => payOrder(order.id, e)}
                                                className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                                            >
                                                立即支付
                                            </button>
                                        )}
                                        <button
                                            className="flex items-center gap-1 px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
                                            查看详情
                                            <ChevronRight className="w-4 h-4"/>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* 分页 */}
            {total > pageSize && (
                <div className="flex justify-center gap-2 mt-4 pb-4">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                        上一页
                    </button>
                    <span className="px-4 py-2 text-gray-600">
            第 {page} 页 / 共 {Math.ceil(total / pageSize)} 页
          </span>
                    <button
                        onClick={() => setPage(p => Math.min(Math.ceil(total / pageSize), p + 1))}
                        disabled={page >= Math.ceil(total / pageSize)}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                        下一页
                    </button>
                </div>
            )}

            <Loading loading={false}/>
        </div>
    );
}

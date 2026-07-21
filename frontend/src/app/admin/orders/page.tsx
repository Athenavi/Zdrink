'use client';

import {useCallback, useEffect, useMemo, useState} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow,} from '@/components/ui/table';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import {
    AlertCircle,
    CheckCircle2,
    ChevronRight,
    ClipboardList,
    Clock,
    CreditCard,
    Eye,
    Loader2,
    Package,
    Receipt,
    RefreshCw,
    ShoppingCart,
    XCircle,
} from 'lucide-react';
import type {Order, OrderItem} from '@/types';

// ---------- 类型定义 ----------

interface DashboardStats {
    total_orders: number;
    total_revenue: number;
    pending_orders: number;
    preparing_orders: number;
    paid_orders?: number;
}

interface OrderListResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: Order[];
}

interface StatusLog {
    id: number;
    from_status: string;
    to_status: string;
    changed_by_name?: string;
    notes?: string;
    created_at: string;
}

interface OrderDetail extends Order {
    shop_name?: string;
    customer_name?: string;
    customer_phone?: string;
    payment_method?: string;
    transaction_id?: string;
    status_logs?: StatusLog[];
}

// ---------- 常量 ----------

const PAGE_SIZE = 15;

const STATUS_TABS = [
    {value: '', label: '全部'},
    {value: 'pending', label: '待支付'},
    {value: 'paid', label: '待处理'},
    {value: 'preparing', label: '制作中'},
    {value: 'completed', label: '已完成'},
    {value: 'cancelled', label: '已取消'},
] as const;

const STATUS_MAP: Record<string, {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'
}> = {
    pending: {label: '待支付', variant: 'warning'},
    paid: {label: '待处理', variant: 'default'},
    preparing: {label: '制作中', variant: 'secondary'},
    ready: {label: '可取餐', variant: 'success'},
    delivered: {label: '配送中', variant: 'default'},
    completed: {label: '已完成', variant: 'success'},
    cancelled: {label: '已取消', variant: 'destructive'},
    confirmed: {label: '已确认', variant: 'success'},
};

const DELIVERY_LABEL: Record<string, string> = {
    delivery: '外卖配送',
    pickup: '到店自取',
    dine_in: '堂食',
};

// ---------- 工具函数 ----------

function formatDateTime(iso?: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatCurrency(val: number | string | undefined | null): string {
    if (val == null) return '¥0.00';
    const n = typeof val === 'string' ? parseFloat(val) : val;
    return `¥${n.toFixed(2)}`;
}

// ---------- 主组件 ----------

export default function OrdersPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // 从 URL 读取当前状态筛选
    const activeStatus = searchParams.get('status') || '';

    // 数据状态
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    // 详情弹窗
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailOrder, setDetailOrder] = useState<OrderDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    // 取消弹窗
    const [cancelOpen, setCancelOpen] = useState(false);
    const [cancelOrderId, setCancelOrderId] = useState<number | null>(null);
    const [cancelNotes, setCancelNotes] = useState('');

    // ---------- 数据加载 ----------

    const loadStats = useCallback(async () => {
        try {
            const api = (await import('@/lib/api')).default;
            const res = await api.get('/api/orders/dashboard/');
            const data = res.data?.today || res.data;
            setStats(data);
        } catch (e) {
            console.error('加载统计数据失败:', e);
        }
    }, []);

    const loadOrders = useCallback(async () => {
        setLoading(true);
        try {
            const api = (await import('@/lib/api')).default;
            const params: Record<string, string | number> = {
                page,
                page_size: PAGE_SIZE,
            };
            if (activeStatus) {
                params.status = activeStatus;
            }
            const res = await api.get('/api/orders/orders/', {params});
            const data: OrderListResponse = res.data;
            setOrders(data.results || []);
            setTotalCount(data.count || 0);
        } catch (e) {
            console.error('加载订单列表失败:', e);
            setOrders([]);
            setTotalCount(0);
        } finally {
            setLoading(false);
        }
    }, [activeStatus, page]);

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    useEffect(() => {
        setPage(1);
    }, [activeStatus]);

    useEffect(() => {
        loadOrders();
    }, [loadOrders]);

    // ---------- 状态切换（URL 驱动）----------

    const handleStatusChange = useCallback(
        (status: string) => {
            const params = new URLSearchParams(searchParams.toString());
            if (status) {
                params.set('status', status);
            } else {
                params.delete('status');
            }
            router.push(`/admin/orders?${params.toString()}`);
        },
        [router, searchParams],
    );

    // ---------- 详情 ----------

    const openDetail = useCallback(async (orderId: number) => {
        setDetailLoading(true);
        setDetailOpen(true);
        try {
            const api = (await import('@/lib/api')).default;
            const res = await api.get(`/api/orders/orders/${orderId}/`);
            setDetailOrder(res.data);
        } catch (e) {
            console.error('加载订单详情失败:', e);
            setDetailOrder(null);
        } finally {
            setDetailLoading(false);
        }
    }, []);

    // ---------- 状态操作 ----------

    const handleConfirm = useCallback(
        async (orderId: number) => {
            setActionLoading(orderId);
            try {
                const api = (await import('@/lib/api')).default;
                await api.post(`/api/orders/orders/${orderId}/update_status/`, {
                    status: 'preparing',
                    notes: '',
                });
                await loadOrders();
                await loadStats();
            } catch (e) {
                console.error('确认订单失败:', e);
            } finally {
                setActionLoading(null);
            }
        },
        [loadOrders, loadStats],
    );

    const handleComplete = useCallback(
        async (orderId: number) => {
            setActionLoading(orderId);
            try {
                const api = (await import('@/lib/api')).default;
                await api.post(`/api/orders/orders/${orderId}/update_status/`, {
                    status: 'completed',
                    notes: '',
                });
                await loadOrders();
                await loadStats();
            } catch (e) {
                console.error('完成订单失败:', e);
            } finally {
                setActionLoading(null);
            }
        },
        [loadOrders, loadStats],
    );

    const openCancel = useCallback((orderId: number) => {
        setCancelOrderId(orderId);
        setCancelNotes('');
        setCancelOpen(true);
    }, []);

    const handleCancel = useCallback(async () => {
        if (cancelOrderId == null) return;
        setActionLoading(cancelOrderId);
        try {
            const api = (await import('@/lib/api')).default;
            await api.post(`/api/orders/orders/${cancelOrderId}/cancel/`, {
                notes: cancelNotes,
            });
            setCancelOpen(false);
            setCancelOrderId(null);
            await loadOrders();
            await loadStats();
            // 如果详情打开且是同一个订单，刷新详情
            if (detailOrder?.id === cancelOrderId) {
                openDetail(cancelOrderId);
            }
        } catch (e) {
            console.error('取消订单失败:', e);
        } finally {
            setActionLoading(null);
        }
    }, [cancelOrderId, cancelNotes, loadOrders, loadStats, detailOrder, openDetail]);

    // ---------- 分页 ----------

    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

    const handlePageChange = useCallback(
        (p: number) => {
            if (p < 1 || p > totalPages) return;
            setPage(p);
        },
        [totalPages],
    );

    const renderPageNumbers = useMemo(() => {
        const items: React.ReactNode[] = [];
        const maxVisible = 7;
        let start = Math.max(1, page - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);
        if (end - start + 1 < maxVisible) {
            start = Math.max(1, end - maxVisible + 1);
        }

        if (start > 1) {
            items.push(
                <PaginationItem key={1}>
                    <PaginationLink onClick={() => handlePageChange(1)}>1</PaginationLink>
                </PaginationItem>,
            );
            if (start > 2) {
                items.push(
                    <PaginationItem key="start-ellipsis">
                        <PaginationEllipsis/>
                    </PaginationItem>,
                );
            }
        }

        for (let i = start; i <= end; i++) {
            items.push(
                <PaginationItem key={i}>
                    <PaginationLink
                        isActive={i === page}
                        onClick={() => handlePageChange(i)}
                    >
                        {i}
                    </PaginationLink>
                </PaginationItem>,
            );
        }

        if (end < totalPages) {
            if (end < totalPages - 1) {
                items.push(
                    <PaginationItem key="end-ellipsis">
                        <PaginationEllipsis/>
                    </PaginationItem>,
                );
            }
            items.push(
                <PaginationItem key={totalPages}>
                    <PaginationLink onClick={() => handlePageChange(totalPages)}>
                        {totalPages}
                    </PaginationLink>
                </PaginationItem>,
            );
        }

        return items;
    }, [page, totalPages, handlePageChange]);

    // ---------- 渲染操作按钮 ----------

    const renderActions = useCallback(
        (order: Order) => {
            const status = order.status;
            const isLoading = actionLoading === order.id;
            const btns: React.ReactNode[] = [];

            // 查看详情
            btns.push(
                <Button
                    key="view"
                    variant="ghost"
                    size="xs"
                    onClick={() => openDetail(order.id)}
                    disabled={isLoading}
                >
                    <Eye size={14}/>
                    <span className="hidden sm:inline-flex sm:ml-1">详情</span>
                </Button>,
            );

            // 待处理 → 确认（变为制作中）
            if (status === 'paid') {
                btns.push(
                    <Button
                        key="confirm"
                        variant="default"
                        size="xs"
                        onClick={() => handleConfirm(order.id)}
                        disabled={isLoading}
                    >
                        {isLoading ? <Loader2 size={14} className="animate-spin"/> : <CheckCircle2 size={14}/>}
                        <span className="hidden sm:inline-flex sm:ml-1">确认</span>
                    </Button>,
                );
            }

            // 制作中 → 完成
            if (status === 'preparing') {
                btns.push(
                    <Button
                        key="complete"
                        variant="default"
                        size="xs"
                        onClick={() => handleComplete(order.id)}
                        disabled={isLoading}
                    >
                        {isLoading ? <Loader2 size={14} className="animate-spin"/> : <CheckCircle2 size={14}/>}
                        <span className="hidden sm:inline-flex sm:ml-1">完成</span>
                    </Button>,
                );
            }

            // 可取消的订单（待支付、待处理）
            if (status === 'pending' || status === 'paid') {
                btns.push(
                    <Button
                        key="cancel"
                        variant="destructive"
                        size="xs"
                        onClick={() => openCancel(order.id)}
                        disabled={isLoading}
                    >
                        {isLoading ? <Loader2 size={14} className="animate-spin"/> : <XCircle size={14}/>}
                        <span className="hidden sm:inline-flex sm:ml-1">取消</span>
                    </Button>,
                );
            }

            return <div className="flex items-center gap-1">{btns}</div>;
        },
        [actionLoading, openDetail, handleConfirm, handleComplete, openCancel],
    );

    // ---------- 统计卡片配置 ----------

    const statCards = useMemo(
        () => [
            {
                label: '今日订单',
                value: stats?.total_orders ?? '—',
                icon: <ShoppingCart size={20}/>,
                color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
            },
            {
                label: '今日营收',
                value: stats?.total_revenue != null ? `¥${Number(stats.total_revenue).toFixed(2)}` : '—',
                icon: <CreditCard size={20}/>,
                color: 'text-green-600 bg-green-100 dark:bg-green-900/30',
            },
            {
                label: '待处理',
                value: stats?.paid_orders ?? stats?.pending_orders ?? '—',
                icon: <Clock size={20}/>,
                color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
            },
            {
                label: '制作中',
                value: stats?.preparing_orders ?? '—',
                icon: <Package size={20}/>,
                color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
            },
        ],
        [stats],
    );

    // ---------- 渲染 ----------

    return (
        <div className="space-y-6">
            {/* 页面标题 */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">订单管理</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        查看和处理所有订单，支持状态筛选与快速操作
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => {
                    loadStats();
                    loadOrders();
                }}>
                    <RefreshCw size={14}/>
                    <span className="ml-1">刷新</span>
                </Button>
            </div>

            {/* 统计卡片 */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {statCards.map((card) => (
                    <Card key={card.label} size="sm">
                        <CardContent className="flex items-center gap-4">
                            <div
                                className={`flex size-10 items-center justify-center rounded-lg ${card.color}`}
                            >
                                {card.icon}
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">{card.label}</p>
                                <p className="text-xl font-bold">{card.value}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* 主列表卡片 */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ClipboardList size={16}/>
                        订单列表
                        {totalCount > 0 && (
                            <span className="text-sm font-normal text-muted-foreground">
                                （共 {totalCount} 条）
                            </span>
                        )}
                    </CardTitle>
                    {/* 状态筛选 Tabs */}
                    <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-1">
                        {STATUS_TABS.map((tab) => (
                            <button
                                key={tab.value}
                                onClick={() => handleStatusChange(tab.value)}
                                className={`inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all outline-none select-none ${
                                    activeStatus === tab.value
                                        ? 'bg-primary text-primary-foreground shadow-xs'
                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-12 text-muted-foreground">
                            <Loader2 size={20} className="animate-spin mr-2"/>
                            加载中...
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <ClipboardList size={40} className="mb-3 opacity-30"/>
                            <p>暂无订单</p>
                        </div>
                    ) : (
                        <>
                            {/* 表格 */}
                            <div className="rounded-lg border overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[160px]">订单号</TableHead>
                                            <TableHead>客户</TableHead>
                                            <TableHead className="text-right">金额</TableHead>
                                            <TableHead className="text-center">状态</TableHead>
                                            <TableHead className="w-[140px]">时间</TableHead>
                                            <TableHead className="text-right w-[180px]">操作</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {orders.map((order) => (
                                            <TableRow key={order.id}>
                                                <TableCell className="font-mono text-xs">
                                                    {order.order_number || order.order_no || `#${order.id}`}
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        <p className="text-sm font-medium">
                                                            {order.customer_name || '匿名用户'}
                                                        </p>
                                                        {order.customer_phone && (
                                                            <p className="text-xs text-muted-foreground">
                                                                {order.customer_phone}
                                                            </p>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {formatCurrency(order.total_amount)}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge
                                                        variant={STATUS_MAP[order.status]?.variant || 'outline'}
                                                    >
                                                        {STATUS_MAP[order.status]?.label || order.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {formatDateTime(order.created_at)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {renderActions(order)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* 分页 */}
                            {totalPages > 1 && (
                                <div className="mt-4 flex items-center justify-between">
                                    <p className="text-sm text-muted-foreground">
                                        第 {page} / {totalPages} 页，共 {totalCount} 条
                                    </p>
                                    <Pagination>
                                        <PaginationContent>
                                            <PaginationItem>
                                                <PaginationPrevious
                                                    onClick={() => handlePageChange(page - 1)}
                                                />
                                            </PaginationItem>
                                            {renderPageNumbers}
                                            <PaginationItem>
                                                <PaginationNext
                                                    onClick={() => handlePageChange(page + 1)}
                                                />
                                            </PaginationItem>
                                        </PaginationContent>
                                    </Pagination>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* ---------- 订单详情弹窗 ---------- */}
            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="w-[95vw] max-w-lg sm:w-full max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Receipt size={18}/>
                            订单详情
                        </DialogTitle>
                        <DialogDescription>
                            订单号：{detailOrder?.order_number || detailOrder?.order_no || `#${detailOrder?.id}`}
                        </DialogDescription>
                    </DialogHeader>

                    {detailLoading ? (
                        <div className="flex items-center justify-center py-12 text-muted-foreground">
                            <Loader2 size={20} className="animate-spin mr-2"/>
                            加载中...
                        </div>
                    ) : detailOrder ? (
                        <div className="space-y-5">
                            {/* 基本信息 */}
                            <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/30 p-4 text-sm">
                                <div>
                                    <span className="text-muted-foreground">订单状态</span>
                                    <div className="mt-1">
                                        <Badge variant={STATUS_MAP[detailOrder.status]?.variant || 'outline'}>
                                            {STATUS_MAP[detailOrder.status]?.label || detailOrder.status}
                                        </Badge>
                                    </div>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">支付状态</span>
                                    <div className="mt-1">
                                        <Badge
                                            variant={detailOrder.payment_status === 'paid' ? 'success' : detailOrder.payment_status === 'refunded' ? 'destructive' : 'warning'}
                                        >
                                            {detailOrder.payment_status === 'paid' ? '已支付' : detailOrder.payment_status === 'refunded' ? '已退款' : '未支付'}
                                        </Badge>
                                    </div>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">客户</span>
                                    <p className="mt-1 font-medium">{detailOrder.customer_name || '匿名用户'}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">联系方式</span>
                                    <p className="mt-1 font-medium">{detailOrder.customer_phone || '—'}</p>
                                </div>
                                {detailOrder.shop_name && (
                                    <div>
                                        <span className="text-muted-foreground">所属店铺</span>
                                        <p className="mt-1 font-medium">{detailOrder.shop_name}</p>
                                    </div>
                                )}
                                <div>
                                    <span className="text-muted-foreground">订单类型</span>
                                    <p className="mt-1 font-medium">
                                        {DELIVERY_LABEL[detailOrder.delivery_type || ''] || detailOrder.delivery_type || '—'}
                                    </p>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-muted-foreground">下单时间</span>
                                    <p className="mt-1 font-medium">{formatDateTime(detailOrder.created_at)}</p>
                                </div>
                                {detailOrder.remarks && (
                                    <div className="col-span-2">
                                        <span className="text-muted-foreground">备注</span>
                                        <p className="mt-1 text-sm">{detailOrder.remarks}</p>
                                    </div>
                                )}
                                {detailOrder.delivery_address && (
                                    <div className="col-span-2">
                                        <span className="text-muted-foreground">配送地址</span>
                                        <p className="mt-1 text-sm">
                                            {detailOrder.delivery_address.province}
                                            {detailOrder.delivery_address.city}
                                            {detailOrder.delivery_address.district}
                                            {detailOrder.delivery_address.detail}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* 商品列表 */}
                            <div>
                                <h4 className="mb-2 text-sm font-medium flex items-center gap-1.5">
                                    <Package size={14}/>
                                    商品明细
                                </h4>
                                <div className="rounded-lg border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>商品</TableHead>
                                                <TableHead className="text-center">数量</TableHead>
                                                <TableHead className="text-right">单价</TableHead>
                                                <TableHead className="text-right">小计</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {(detailOrder.items || []).map((item: OrderItem) => (
                                                <TableRow key={item.id}>
                                                    <TableCell>
                                                        <p className="text-sm font-medium">{item.product_name || `商品 #${item.product}`}</p>
                                                        {item.sku_name && (
                                                            <p className="text-xs text-muted-foreground">
                                                                {item.sku_name}
                                                            </p>
                                                        )}
                                                        {item.sku_specifications && (
                                                            <p className="text-xs text-muted-foreground">
                                                                {Object.values(item.sku_specifications).join(' / ')}
                                                            </p>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-center">{item.quantity}</TableCell>
                                                    <TableCell
                                                        className="text-right">{formatCurrency(item.unit_price || item.price)}</TableCell>
                                                    <TableCell
                                                        className="text-right font-medium">{formatCurrency(item.total_price)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* 金额汇总 */}
                                <div className="mt-3 space-y-1 text-sm text-right">
                                    <div className="flex justify-end gap-4">
                                        <span className="text-muted-foreground">订单总额</span>
                                        <span>{formatCurrency(detailOrder.total_amount)}</span>
                                    </div>
                                    {Number(detailOrder.delivery_fee || 0) > 0 && (
                                        <div className="flex justify-end gap-4">
                                            <span className="text-muted-foreground">配送费</span>
                                            <span>{formatCurrency(detailOrder.delivery_fee)}</span>
                                        </div>
                                    )}
                                    {Number(detailOrder.discount_amount || 0) > 0 && (
                                        <div className="flex justify-end gap-4 text-green-600">
                                            <span className="text-muted-foreground">优惠减免</span>
                                            <span>-{formatCurrency(detailOrder.discount_amount)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-end gap-4 border-t pt-1 font-semibold">
                                        <span>实付金额</span>
                                        <span
                                            className="text-lg">{formatCurrency(detailOrder.payment_amount || detailOrder.total_amount)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* 支付信息 */}
                            {detailOrder.paid_at && (
                                <div>
                                    <h4 className="mb-2 text-sm font-medium flex items-center gap-1.5">
                                        <CreditCard size={14}/>
                                        支付信息
                                    </h4>
                                    <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/30 p-4 text-sm">
                                        <div>
                                            <span className="text-muted-foreground">支付时间</span>
                                            <p className="mt-1 font-medium">{formatDateTime(detailOrder.paid_at)}</p>
                                        </div>
                                        {detailOrder.payment_method && (
                                            <div>
                                                <span className="text-muted-foreground">支付方式</span>
                                                <p className="mt-1 font-medium">{detailOrder.payment_method}</p>
                                            </div>
                                        )}
                                        {detailOrder.transaction_id && (
                                            <div className="col-span-2">
                                                <span className="text-muted-foreground">交易流水号</span>
                                                <p className="mt-1 font-mono text-xs">{detailOrder.transaction_id}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* 状态变更日志 */}
                            {detailOrder.status_logs && detailOrder.status_logs.length > 0 && (
                                <div>
                                    <h4 className="mb-2 text-sm font-medium flex items-center gap-1.5">
                                        <Clock size={14}/>
                                        状态变更日志
                                    </h4>
                                    <div className="space-y-2">
                                        {detailOrder.status_logs.map((log: StatusLog) => (
                                            <div
                                                key={log.id}
                                                className="flex items-start gap-3 rounded-lg bg-muted/30 px-3 py-2 text-sm"
                                            >
                                                <ChevronRight size={14}
                                                              className="mt-0.5 text-muted-foreground shrink-0"/>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <Badge variant="outline" className="text-xs">
                                                            {STATUS_MAP[log.from_status]?.label || log.from_status}
                                                        </Badge>
                                                        <span className="text-muted-foreground">→</span>
                                                        <Badge variant="outline" className="text-xs">
                                                            {STATUS_MAP[log.to_status]?.label || log.to_status}
                                                        </Badge>
                                                        {log.changed_by_name && (
                                                            <span className="text-xs text-muted-foreground">
                                                                — {log.changed_by_name}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                        {formatDateTime(log.created_at)}
                                                        {log.notes && ` · ${log.notes}`}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                            <AlertCircle size={32} className="mb-2"/>
                            <p>加载订单详情失败</p>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDetailOpen(false)}>
                            关闭
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ---------- 取消订单确认弹窗 ---------- */}
            <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertCircle size={18}/>
                            取消订单
                        </DialogTitle>
                        <DialogDescription>
                            确定要取消该订单吗？此操作不可撤销。
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3">
                        <label className="text-sm font-medium">
                            取消原因（可选）
                        </label>
                        <textarea
                            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 placeholder:text-muted-foreground min-h-[80px] resize-y"
                            placeholder="请输入取消原因..."
                            value={cancelNotes}
                            onChange={(e) => setCancelNotes(e.target.value)}
                        />
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCancelOpen(false)}>
                            返回
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleCancel}
                            disabled={actionLoading === cancelOrderId}
                        >
                            {actionLoading === cancelOrderId ? (
                                <Loader2 size={14} className="animate-spin mr-1"/>
                            ) : (
                                <XCircle size={14} className="mr-1"/>
                            )}
                            确认取消
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

'use client';

import {useEffect, useState} from 'react';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {AlertTriangle, BarChart3, Clock, DollarSign, Package, ShoppingCart, TrendingUp, Users,} from 'lucide-react';

interface DashboardStats {
    total_orders: number;
    total_revenue: number;
    pending_orders: number;
    preparing_orders: number;
}

interface LowStockItem {
    sku_code: string;
    stock_quantity: number;
    low_stock_threshold: number;
}

export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const api = (await import('@/lib/api')).default;
                const [statsRes, stockRes] = await Promise.allSettled([
                    api.get('/api/orders/dashboard/'),
                    api.get('/api/products/inventory/low-stock-alert/'),
                ]);

                if (statsRes.status === 'fulfilled') {
                    setStats(statsRes.value.data?.today || statsRes.value.data);
                }
                if (stockRes.status === 'fulfilled') {
                    setLowStock(stockRes.value.data?.results || stockRes.value.data || []);
                }
            } catch (e) {
                console.error('加载仪表盘数据失败:', e);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, []);

    const statCards = [
        {
            label: '今日订单',
            value: stats?.total_orders ?? '—',
            icon: <ShoppingCart size={20}/>,
            color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
        },
        {
            label: '今日营收',
            value: stats?.total_revenue != null ? `¥${Number(stats.total_revenue).toFixed(2)}` : '—',
            icon: <DollarSign size={20}/>,
            color: 'text-green-600 bg-green-100 dark:bg-green-900/30',
        },
        {
            label: '待处理',
            value: stats?.pending_orders ?? '—',
            icon: <Clock size={20}/>,
            color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
        },
        {
            label: '制作中',
            value: stats?.preparing_orders ?? '—',
            icon: <Package size={20}/>,
            color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
        },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold">仪表盘</h1>
                <p className="text-sm text-muted-foreground mt-1">欢迎回来，查看今日经营概况</p>
            </div>

            {/* 统计卡片 */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {statCards.map((card) => (
                    <Card key={card.label} size="sm">
                        <CardContent className="flex items-center gap-4">
                            <div className={`flex size-10 items-center justify-center rounded-lg ${card.color}`}>
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

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* 低库存预警 */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle size={16} className="text-amber-500"/>
                            低库存预警
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <p className="text-sm text-muted-foreground">加载中...</p>
                        ) : lowStock.length === 0 ? (
                            <p className="text-sm text-muted-foreground">所有商品库存充足</p>
                        ) : (
                            <div className="space-y-2">
                                {lowStock.slice(0, 10).map((item, i) => (
                                    <div key={i}
                                         className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                                        <span className="font-medium">{item.sku_code}</span>
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={item.stock_quantity === 0 ? 'text-destructive font-semibold' : 'text-amber-600'}>
                                                {item.stock_quantity}
                                            </span>
                                            <Badge variant={item.stock_quantity === 0 ? 'destructive' : 'warning'}>
                                                {item.stock_quantity === 0 ? '缺货' : '偏低'}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* 快速入口 */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp size={16} className="text-primary"/>
                            快捷操作
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-3">
                            <a href="/admin/orders"
                               className="flex items-center gap-3 rounded-lg border p-4 text-sm hover:bg-muted/50 transition-colors">
                                <ShoppingCart size={20} className="text-blue-500"/>
                                <div>
                                    <p className="font-medium">订单管理</p>
                                    <p className="text-xs text-muted-foreground">查看和处理订单</p>
                                </div>
                            </a>
                            <a href="/admin/products"
                               className="flex items-center gap-3 rounded-lg border p-4 text-sm hover:bg-muted/50 transition-colors">
                                <Package size={20} className="text-green-500"/>
                                <div>
                                    <p className="font-medium">商品管理</p>
                                    <p className="text-xs text-muted-foreground">上架和编辑商品</p>
                                </div>
                            </a>
                            <a href="/admin/customers"
                               className="flex items-center gap-3 rounded-lg border p-4 text-sm hover:bg-muted/50 transition-colors">
                                <Users size={20} className="text-purple-500"/>
                                <div>
                                    <p className="font-medium">客户管理</p>
                                    <p className="text-xs text-muted-foreground">会员和积分管理</p>
                                </div>
                            </a>
                            <a href="/admin/reports"
                               className="flex items-center gap-3 rounded-lg border p-4 text-sm hover:bg-muted/50 transition-colors">
                                <BarChart3 size={20} className="text-amber-500"/>
                                <div>
                                    <p className="font-medium">数据报表</p>
                                    <p className="text-xs text-muted-foreground">查看经营数据</p>
                                </div>
                            </a>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

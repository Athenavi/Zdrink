'use client';

import {useCallback, useEffect, useState} from 'react';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {DollarSign, Loader2, RefreshCw, ShoppingCart, Table2, TrendingUp, Wallet,} from 'lucide-react';
import apiClient from '@/lib/api';
import {formatPrice} from '@/utils';

interface POSDashboardData {
    today_revenue: number;
    today_orders: number;
    today_refunds: number;
    active_tables: number;
    available_tables: number;
    payment_breakdown: Record<string, number>;
    popular_products: { product_name: string; total_quantity: number }[];
}

export default function POSDashboardPage() {
    const [data, setData] = useState<POSDashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await apiClient.get('/api/pos/dashboard/');
            setData(res.data);
        } catch {
            setError('加载 POS 仪表盘数据失败');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 size={24} className="animate-spin text-muted-foreground"/>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
                <p className="text-destructive text-sm">{error}</p>
                <Button variant="outline" size="sm" onClick={fetchData}>
                    <RefreshCw size={14} className="mr-1"/> 重试
                </Button>
            </div>
        );
    }

    const stats = [
        {
            label: '今日营收',
            value: data ? formatPrice(data.today_revenue) : '—',
            icon: <DollarSign size={20}/>,
            color: 'text-green-600 bg-green-100',
        },
        {
            label: '今日订单',
            value: data ? String(data.today_orders) : '—',
            icon: <ShoppingCart size={20}/>,
            color: 'text-blue-600 bg-blue-100',
        },
        {
            label: '占用桌台',
            value: data ? String(data.active_tables) : '—',
            icon: <Table2 size={20}/>,
            color: 'text-amber-600 bg-amber-100',
        },
        {
            label: '可用桌台',
            value: data ? String(data.available_tables) : '—',
            icon: <TrendingUp size={20}/>,
            color: 'text-purple-600 bg-purple-100',
        },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">POS 仪表盘</h1>
                    <p className="text-sm text-muted-foreground mt-1">今日营业数据概览</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchData}>
                    <RefreshCw size={14} className="mr-1"/> 刷新
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((s) => (
                    <Card key={s.label}>
                        <CardContent className="flex items-center gap-4 pt-6">
                            <div className={`flex size-10 items-center justify-center rounded-lg ${s.color}`}>
                                {s.icon}
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">{s.label}</p>
                                <p className="text-xl font-bold">{s.value}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* 热门商品 */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <ShoppingCart size={16}/> 热销商品 Top 10
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {data && data.popular_products.length > 0 ? (
                            <div className="space-y-2">
                                {data.popular_products.map((p, i) => (
                                    <div key={i}
                                         className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                                        <span className="truncate flex-1">{p.product_name}</span>
                                        <span className="text-muted-foreground ml-2">x{p.total_quantity}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground py-4 text-center">暂无数据</p>
                        )}
                    </CardContent>
                </Card>

                {/* 支付方式分布 */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Wallet size={16}/> 支付方式分布
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {data && data.payment_breakdown && Object.keys(data.payment_breakdown).length > 0 ? (
                            <div className="space-y-2">
                                {Object.entries(data.payment_breakdown).map(([method, amount]) => (
                                    <div key={method}
                                         className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                                        <span>{method}</span>
                                        <span className="font-medium">{formatPrice(amount)}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground py-4 text-center">暂无数据</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

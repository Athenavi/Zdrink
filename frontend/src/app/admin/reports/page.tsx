'use client'

import {useCallback, useEffect, useState} from 'react'
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table'
import {BarChart3, CalendarDays, DollarSign, Loader2, ShoppingCart, TrendingUp, Wallet} from 'lucide-react'
import {Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,} from 'recharts'

// ---------- 类型定义 ----------

interface DailyReport {
    date: string
    total_orders: number
    total_revenue: number
    average_order_value: number
}

interface BreakdownItem {
    order_type?: string;
    payment_method?: string;
    total_orders: number;
    total_revenue: number;
}

interface SalesReportResponse {
    daily: DailyReport[];
    by_type: BreakdownItem[];
    by_payment: BreakdownItem[];
}

// ---------- 默认日期范围 ----------

function getDefaultStartDate(): string {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().slice(0, 10)
}

function getDefaultEndDate(): string {
    return new Date().toISOString().slice(0, 10)
}

// ---------- 工具函数 ----------

function formatCurrency(value: number | null | undefined): string {
    if (value == null) return '—'
    return '¥' + Number(value).toLocaleString('zh-CN', {minimumFractionDigits: 2, maximumFractionDigits: 2})
}

function formatNumber(value: number | null | undefined): string {
    if (value == null) return '—'
    return Number(value).toLocaleString('zh-CN')
}

// ---------- 页面组件 ----------

export default function ReportsPage() {
    const [startDate, setStartDate] = useState(getDefaultStartDate)
    const [endDate, setEndDate] = useState(getDefaultEndDate)
    const [data, setData] = useState<DailyReport[] | null>(null)
    const [typeBreakdown, setTypeBreakdown] = useState<BreakdownItem[]>([])
    const [paymentBreakdown, setPaymentBreakdown] = useState<BreakdownItem[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchReport = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const api = (await import('@/lib/api')).default
            const url = `/api/orders/orders/sales_report/?start_date=${startDate}&end_date=${endDate}`
            const res = await api.get<SalesReportResponse>(url)
            setData(res.data.daily)
            setTypeBreakdown(res.data.by_type)
            setPaymentBreakdown(res.data.by_payment)
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : '加载报表数据失败'
            setError(msg)
            console.error('加载报表数据失败:', e)
        } finally {
            setLoading(false)
        }
    }, [startDate, endDate])

    // 初始加载
    useEffect(() => {
        fetchReport()
    }, [fetchReport])

    const summary = data && data.length > 0 ? {
        total_orders: data.reduce((s, r) => s + r.total_orders, 0),
        total_revenue: data.reduce((s, r) => s + Number(r.total_revenue), 0),
        avg_daily_orders: Math.round(data.reduce((s, r) => s + r.total_orders, 0) / data.length * 10) / 10,
        avg_order_value: data.reduce((s, r) => s + Number(r.average_order_value), 0) / data.length,
        days: data.length,
    } : null

    const statCards = [
        {
            label: '总订单数',
            value: summary ? formatNumber(summary.total_orders) : '—',
            icon: <ShoppingCart size={20}/>,
            color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
        },
        {
            label: '总收入',
            value: summary ? formatCurrency(summary.total_revenue) : '—',
            icon: <DollarSign size={20}/>,
            color: 'text-green-600 bg-green-100 dark:bg-green-900/30',
        },
        {
            label: '日均订单',
            value: summary ? formatNumber(summary.avg_daily_orders) : '—',
            icon: <TrendingUp size={20}/>,
            color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
        },
        {
            label: '平均客单价',
            value: summary ? formatCurrency(summary.avg_order_value) : '—',
            icon: <Wallet size={20}/>,
            color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
        },
    ]

    return (
        <div className="space-y-6">
            {/* 页面标题 */}
            <div>
                <h1 className="text-2xl font-semibold">数据报表</h1>
                <p className="text-sm text-muted-foreground mt-1">查看销售数据统计与分析</p>
            </div>

            {/* 日期范围筛选 */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CalendarDays size={16} className="text-primary"/>
                        日期范围
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="space-y-1.5">
                            <label className="text-xs text-muted-foreground">起始日期</label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-44"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs text-muted-foreground">结束日期</label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-44"
                            />
                        </div>
                        <Button onClick={fetchReport} disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 size={14} className="animate-spin"/>
                                    查询中…
                                </>
                            ) : (
                                '查询'
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* 统计摘要卡片 */}
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

            {/* 统计图表 */}
            {data && data.length > 0 && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* 营收趋势折线图 */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <TrendingUp size={16} className="text-primary"/>
                                营收趋势
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={240}>
                                <AreaChart data={data}>
                                    <defs>
                                        <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                                    <XAxis dataKey="date" tick={{fontSize: 12}}
                                           tickFormatter={(v: string) => v.slice(5)}/>
                                    <YAxis tick={{fontSize: 12}}
                                           tickFormatter={(v: number) => `¥${(v / 1000).toFixed(0)}k`}/>
                                    <Tooltip
                                        formatter={(value: number) => [`¥${Number(value).toLocaleString()}`, '营收']}
                                        labelFormatter={(label: string) => `日期: ${label}`}
                                    />
                                    <Area
                                        type="monotone" dataKey="total_revenue" stroke="#3b82f6"
                                        fill="url(#revenueGrad)" strokeWidth={2}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* 订单量柱状图 */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <ShoppingCart size={16} className="text-primary"/>
                                每日订单数
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={240}>
                                <BarChart data={data}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                                    <XAxis dataKey="date" tick={{fontSize: 12}}
                                           tickFormatter={(v: string) => v.slice(5)}/>
                                    <YAxis tick={{fontSize: 12}} allowDecimals={false}/>
                                    <Tooltip
                                        formatter={(value: number) => [value, '订单数']}
                                        labelFormatter={(label: string) => `日期: ${label}`}
                                    />
                                    <Bar dataKey="total_orders" fill="#22c55e" radius={[4, 4, 0, 0]}/>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* 维度分析 */}
            {data && data.length > 0 && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <ShoppingCart size={16}/> 按订单类型
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {typeBreakdown.length > 0 ? (
                                <div className="space-y-2">
                                    {typeBreakdown.map((item) => (
                                        <div key={item.order_type}
                                             className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                                            <span>{item.order_type === 'dine_in' ? '堂食' : item.order_type === 'takeaway' ? '自取' : item.order_type === 'delivery' ? '外卖' : item.order_type}</span>
                                            <span
                                                className="text-muted-foreground">{item.total_orders} 单 / ¥{Number(item.total_revenue).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground py-4 text-center">暂无数据</p>
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <DollarSign size={16}/> 按支付方式
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {paymentBreakdown.length > 0 ? (
                                <div className="space-y-2">
                                    {paymentBreakdown.map((item) => (
                                        <div key={item.payment_method}
                                             className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                                            <span>{item.payment_method || '未指定'}</span>
                                            <span
                                                className="text-muted-foreground">{item.total_orders} 单 / ¥{Number(item.total_revenue).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground py-4 text-center">暂无数据</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* 数据表格 */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 size={16} className="text-primary"/>
                        每日销售明细
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                <Loader2 size={24} className="animate-spin"/>
                                <span className="text-sm">加载中…</span>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="flex items-center justify-center py-12">
                            <p className="text-sm text-destructive">{error}</p>
                        </div>
                    ) : !data || data.length === 0 ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                <BarChart3 size={32} className="opacity-40"/>
                                <span className="text-sm">所选日期范围内暂无数据</span>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>日期</TableHead>
                                        <TableHead className="text-right">订单数</TableHead>
                                        <TableHead className="text-right">收入</TableHead>
                                        <TableHead className="text-right">平均客单价</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.map((row) => (
                                        <TableRow key={row.date}>
                                            <TableCell className="font-medium">
                                                {row.date}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {formatNumber(row.total_orders)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {formatCurrency(row.total_revenue)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {formatCurrency(row.average_order_value)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

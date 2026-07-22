'use client';

import {useCallback, useEffect, useState} from 'react';
import {Card, CardContent} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {AlertCircle, Loader2, RefreshCw, Table2, User,} from 'lucide-react';
import apiClient from '@/lib/api';
import {formatPrice} from '@/utils';

interface TableInfo {
    table_id: number;
    table_number: string;
    table_name: string;
    status: 'available' | 'occupied' | 'reserved' | 'cleaning' | 'maintenance';
    current_order: {
        order_number: string;
        status: string;
        total_amount: number;
        created_at: string;
    } | null;
    capacity: string;
}

const statusLabels: Record<string, string> = {
    available: '空闲',
    occupied: '占用',
    reserved: '预订',
    cleaning: '清洁中',
    maintenance: '维护中',
};

const statusColors: Record<string, string> = {
    available: 'bg-green-100 text-green-700 border-green-300',
    occupied: 'bg-red-100 text-red-700 border-red-300',
    reserved: 'bg-blue-100 text-blue-700 border-blue-300',
    cleaning: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    maintenance: 'bg-gray-100 text-gray-700 border-gray-300',
};

export default function TablesPage() {
    const [tables, setTables] = useState<TableInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTables = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await apiClient.get('/api/pos/tables/status/');
            setTables(res.data);
        } catch {
            setError('加载桌台数据失败');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTables();
    }, [fetchTables]);

    const grouped = {
        available: tables.filter((t) => t.status === 'available'),
        occupied: tables.filter((t) => t.status === 'occupied'),
        other: tables.filter((t) => !['available', 'occupied'].includes(t.status)),
    };

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
                <AlertCircle size={24} className="text-destructive"/>
                <p className="text-destructive text-sm">{error}</p>
                <Button variant="outline" size="sm" onClick={fetchTables}>重试</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">桌台管理</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        共 {tables.length} 张桌台 · 空闲 {grouped.available.length} · 占用 {grouped.occupied.length}
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchTables}>
                    <RefreshCw size={14} className="mr-1"/> 刷新
                </Button>
            </div>

            {/* 占用桌台 */}
            {grouped.occupied.length > 0 && (
                <section>
                    <h2 className="text-sm font-medium text-red-600 mb-3 flex items-center gap-1">
                        <User size={14}/> 用餐中 ({grouped.occupied.length})
                    </h2>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {grouped.occupied.map((table) => (
                            <TableCard key={table.table_id} table={table}/>
                        ))}
                    </div>
                </section>
            )}

            {/* 空闲桌台 */}
            {grouped.available.length > 0 && (
                <section>
                    <h2 className="text-sm font-medium text-green-600 mb-3 flex items-center gap-1">
                        <Table2 size={14}/> 空闲桌台 ({grouped.available.length})
                    </h2>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {grouped.available.map((table) => (
                            <TableCard key={table.table_id} table={table}/>
                        ))}
                    </div>
                </section>
            )}

            {/* 其他状态 */}
            {grouped.other.length > 0 && (
                <section>
                    <h2 className="text-sm font-medium text-gray-600 mb-3">其他 ({grouped.other.length})</h2>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {grouped.other.map((table) => (
                            <TableCard key={table.table_id} table={table}/>
                        ))}
                    </div>
                </section>
            )}

            {tables.length === 0 && (
                <div className="text-center py-12 text-muted-foreground text-sm">暂无桌台数据</div>
            )}
        </div>
    );
}

function TableCard({table}: { table: TableInfo }) {
    return (
        <Card
            className={`border-l-4 ${table.status === 'occupied' ? 'border-l-red-500' : table.status === 'available' ? 'border-l-green-500' : 'border-l-gray-300'}`}>
            <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-2">
                    <div>
                        <p className="font-semibold">{table.table_name || `桌台 ${table.table_number}`}</p>
                        <p className="text-xs text-muted-foreground">{table.capacity}</p>
                    </div>
                    <Badge variant="outline" className={statusColors[table.status]}>
                        {statusLabels[table.status]}
                    </Badge>
                </div>
                {table.current_order && (
                    <div className="mt-2 pt-2 border-t text-xs text-muted-foreground space-y-0.5">
                        <p>订单：{table.current_order.order_number}</p>
                        <p>金额：{formatPrice(table.current_order.total_amount)}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

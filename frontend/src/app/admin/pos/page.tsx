'use client';

import Link from 'next/link';
import {Calculator, LayoutDashboard, Printer, Table2,} from 'lucide-react';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';

const posModules = [
    {
        title: '快速收银',
        desc: '扫码添加商品、快速下单结算',
        href: '/pos/checkout',
        icon: <Calculator size={28}/>,
        color: 'text-blue-600 bg-blue-100',
    },
    {
        title: '桌台管理',
        desc: '查看桌台状态、开台、并台、转台',
        href: '/admin/pos/tables',
        icon: <Table2 size={28}/>,
        color: 'text-green-600 bg-green-100',
    },
    {
        title: 'POS 仪表盘',
        desc: '今日营收、订单趋势、桌台使用率',
        href: '/admin/pos/dashboard',
        icon: <LayoutDashboard size={28}/>,
        color: 'text-purple-600 bg-purple-100',
    },
    {
        title: '打印小票',
        desc: '重新打印、补打小票',
        href: '/admin/printing',
        icon: <Printer size={28}/>,
        color: 'text-amber-600 bg-amber-100',
    },
];

export default function POSPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold">POS 收银</h1>
                <p className="text-sm text-muted-foreground mt-1">收银台、桌台管理与营业数据</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {posModules.map((mod) => (
                    <Link key={mod.href} href={mod.href}>
                        <Card className="h-full cursor-pointer transition-colors hover:bg-muted/50">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className={`flex size-10 items-center justify-center rounded-lg ${mod.color}`}>
                                        {mod.icon}
                                    </div>
                                    <CardTitle className="text-base">{mod.title}</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">{mod.desc}</p>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}

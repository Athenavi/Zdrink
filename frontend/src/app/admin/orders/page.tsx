'use client'

import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card'

export default function OrdersPage() {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>订单管理</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        在此页面中您可以查看和管理所有订单，包括订单状态、支付信息、配送进度等。
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}

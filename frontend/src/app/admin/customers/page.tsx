'use client'

import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card'

export default function CustomersPage() {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>客户管理</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        在此页面中您可以查看和管理所有客户信息，包括会员资料、积分记录和消费历史等。
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}

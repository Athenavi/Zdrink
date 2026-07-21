'use client'

import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card'

export default function ReportsPage() {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>数据报表</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        在此页面中您可以查看各类数据报表与统计分析。
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}

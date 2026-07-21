'use client'

import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card'

export default function PrintingPage() {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>打印管理</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        在此页面中您可以管理打印任务与打印设置。
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}

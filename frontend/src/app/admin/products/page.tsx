'use client'

import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card'

export default function ProductsPage() {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>商品管理</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        在此页面中您可以查看和管理所有商品的库存、上架及编辑商品信息。
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}

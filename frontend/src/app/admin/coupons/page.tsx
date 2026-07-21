'use client';

import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';

export default function CouponsPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>优惠促销</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">在此页面中您可以管理优惠券和促销活动。</p>
            </CardContent>
        </Card>
    );
}

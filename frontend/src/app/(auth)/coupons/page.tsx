'use client';

import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {Ticket} from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import Loading from '@/components/Loading';
import {Coupon, couponApi, UserCoupon} from '@/lib/api/coupon';
import {formatPrice} from '@/utils';

type TabType = 'available' | 'used' | 'expired';

export default function CouponsPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TabType>('available');
    const [myCoupons, setMyCoupons] = useState<UserCoupon[]>([]);
    const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(false);
    const [claimingId, setClaimingId] = useState<number | null>(null);

    // 加载我的优惠券
    useEffect(() => {
        loadMyCoupons();
    }, [activeTab]);

    // 加载可领取的优惠券
    useEffect(() => {
        loadAvailableCoupons();
    }, []);

    const loadMyCoupons = async () => {
        setLoading(true);
        try {
            const response = await couponApi.getMyCoupons({status: activeTab});
            const data = response.data;
            if (Array.isArray(data)) {
                setMyCoupons(data);
            } else if (data && Array.isArray(data.results)) {
                setMyCoupons(data.results);
            } else {
                setMyCoupons([]);
            }
        } catch (error) {
            console.error('加载优惠券失败:', error);
            setMyCoupons([]);
        } finally {
            setLoading(false);
        }
    };

    const loadAvailableCoupons = async () => {
        try {
            const response = await couponApi.getAvailableCoupons();
            const data = response.data;
            if (Array.isArray(data)) {
                setAvailableCoupons(data);
            } else if (data && Array.isArray(data.results)) {
                setAvailableCoupons(data.results);
            } else {
                setAvailableCoupons([]);
            }
        } catch (error) {
            console.error('加载可领取优惠券失败:', error);
            setAvailableCoupons([]);
        }
    };

    const handleClaimCoupon = async (couponCode: string, couponId: number) => {
        setClaimingId(couponId);
        try {
            await couponApi.claimCoupon(couponCode);
            alert('领取成功！');
            await Promise.all([loadMyCoupons(), loadAvailableCoupons()]);
        } catch (error: any) {
            alert(error.response?.data?.error || '领取失败');
        } finally {
            setClaimingId(null);
        }
    };

    const getCouponValueText = (coupon: Coupon) => {
        if (coupon.coupon_type === 'fixed') {
            return `¥${formatPrice(coupon.value)}`;
        } else if (coupon.coupon_type === 'percentage') {
            return `${coupon.value}折`;
        } else {
            return '免运费';
        }
    };

    const isCouponExpired = (coupon: Coupon) => {
        return new Date(coupon.valid_until) < new Date();
    };

    const filteredAvailableCoupons = availableCoupons.filter(
        coupon => !isCouponExpired(coupon)
    );

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <AppHeader title="优惠券"/>

            {/* 标签页 */}
            <div className="bg-white border-b border-gray-200 sticky top-14 z-10">
                <div className="flex">
                    <button
                        onClick={() => setActiveTab('available')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${
                            activeTab === 'available'
                                ? 'text-blue-500 border-b-2 border-blue-500'
                                : 'text-gray-600'
                        }`}
                    >
                        可使用
                    </button>
                    <button
                        onClick={() => setActiveTab('used')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${
                            activeTab === 'used'
                                ? 'text-blue-500 border-b-2 border-blue-500'
                                : 'text-gray-600'
                        }`}
                    >
                        已使用
                    </button>
                    <button
                        onClick={() => setActiveTab('expired')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${
                            activeTab === 'expired'
                                ? 'text-blue-500 border-b-2 border-blue-500'
                                : 'text-gray-600'
                        }`}
                    >
                        已过期
                    </button>
                </div>
            </div>

            {/* 优惠券列表 */}
            {loading ? (
                <Loading/>
            ) : (
                <div className="p-3 space-y-3">
                    {myCoupons.length === 0 && activeTab === 'available' && (
                        <div className="text-center py-12 text-gray-400">
                            <Ticket className="w-16 h-16 mx-auto mb-3 opacity-30"/>
                            <p>暂无可用优惠券</p>
                            <p className="text-sm mt-1">快去领取优惠券吧</p>
                        </div>
                    )}

                    {myCoupons.map((userCoupon) => (
                        <div
                            key={userCoupon.id}
                            className="bg-white rounded-lg overflow-hidden shadow-sm"
                        >
                            <div className="flex">
                                {/* 左侧金额区域 */}
                                <div
                                    className="bg-gradient-to-br from-orange-400 to-red-500 text-white p-4 flex flex-col items-center justify-center min-w-[100px]">
                                    <div className="text-2xl font-bold">
                                        {getCouponValueText(userCoupon.coupon)}
                                    </div>
                                    {userCoupon.coupon.min_order_amount > 0 && (
                                        <div className="text-xs mt-1 opacity-90">
                                            满{formatPrice(userCoupon.coupon.min_order_amount)}可用
                                        </div>
                                    )}
                                </div>

                                {/* 右侧信息区域 */}
                                <div className="flex-1 p-4">
                                    <div className="font-medium text-gray-800 mb-1">
                                        {userCoupon.coupon.name}
                                    </div>
                                    <div className="text-xs text-gray-500 mb-2">
                                        有效期至：{new Date(userCoupon.coupon.valid_until).toLocaleDateString('zh-CN')}
                                    </div>
                                    {userCoupon.coupon.description && (
                                        <div className="text-xs text-gray-400">
                                            {userCoupon.coupon.description}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* 可领取的优惠券 */}
            {activeTab === 'available' && filteredAvailableCoupons.length > 0 && (
                <div className="mt-4">
                    <div className="px-3 py-2 text-sm font-medium text-gray-700">
                        可领取的优惠券
                    </div>
                    <div className="space-y-3 px-3">
                        {filteredAvailableCoupons.map((coupon) => (
                            <div
                                key={coupon.id}
                                className="bg-white rounded-lg overflow-hidden shadow-sm border-2 border-dashed border-orange-300"
                            >
                                <div className="flex">
                                    <div
                                        className="bg-gradient-to-br from-yellow-400 to-orange-400 text-white p-4 flex flex-col items-center justify-center min-w-[100px]">
                                        <div className="text-2xl font-bold">
                                            {getCouponValueText(coupon)}
                                        </div>
                                        {coupon.min_order_amount > 0 && (
                                            <div className="text-xs mt-1 opacity-90">
                                                满{formatPrice(coupon.min_order_amount)}可用
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 p-4 flex items-center justify-between">
                                        <div>
                                            <div className="font-medium text-gray-800 mb-1">
                                                {coupon.name}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                有效期至：{new Date(coupon.valid_until).toLocaleDateString('zh-CN')}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleClaimCoupon(coupon.code, coupon.id)}
                                            disabled={claimingId === coupon.id}
                                            className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
                                        >
                                            {claimingId === coupon.id ? '领取中...' : '立即领取'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

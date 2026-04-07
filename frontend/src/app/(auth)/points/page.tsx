'use client';

import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {Calendar, Gift, Star, TrendingUp} from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import {MembershipInfo, pointsApi, PointsLog} from '@/lib/api/points';

const pointsTypeMap: Record<string, { label: string; color: string }> = {
    'earn_order': {label: '消费获得', color: 'text-green-500'},
    'earn_signin': {label: '签到获得', color: 'text-blue-500'},
    'earn_share': {label: '分享获得', color: 'text-purple-500'},
    'earn_referral': {label: '推荐获得', color: 'text-orange-500'},
    'consume_order': {label: '消费抵扣', color: 'text-red-500'},
    'consume_gift': {label: '兑换礼品', color: 'text-pink-500'},
    'expire': {label: '积分过期', color: 'text-gray-500'},
    'adjust': {label: '人工调整', color: 'text-yellow-500'}
};

export default function PointsPage() {
    const router = useRouter();
    const [membershipInfo, setMembershipInfo] = useState<MembershipInfo | null>(null);
    const [pointsLogs, setPointsLogs] = useState<PointsLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [signinLoading, setSigninLoading] = useState(false);

    useEffect(() => {
        loadMembershipInfo();
        loadPointsLogs();
    }, []);

    const loadMembershipInfo = async () => {
        try {
            const response = await pointsApi.getMembershipInfo();
            setMembershipInfo(response.data);
        } catch (error) {
            console.error('加载会员信息失败:', error);
        }
    };

    const loadPointsLogs = async (pageNum = 1) => {
        if (loading) return;

        setLoading(true);
        try {
            const response = await pointsApi.getPointsLogs({
                page: pageNum,
                page_size: 20
            });
            const data = response.data;
            const logs = Array.isArray(data.results) ? data.results : [];
            const count = data.count || 0;

            if (pageNum === 1) {
                setPointsLogs(logs);
            } else {
                setPointsLogs(prev => [...prev, ...logs]);
            }

            setTotal(count);
            setHasMore(pageNum * 20 < count);
            setPage(pageNum);
        } catch (error) {
            console.error('加载积分记录失败:', error);
            setPointsLogs([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSignin = async () => {
        setSigninLoading(true);
        try {
            const response = await pointsApi.signinEarnPoints();
            alert(`签到成功！获得${response.data.points_earned}积分`);
            await Promise.all([loadMembershipInfo(), loadPointsLogs(1)]);
        } catch (error: any) {
            alert(error.response?.data?.error || '签到失败');
        } finally {
            setSigninLoading(false);
        }
    };

    const handleLoadMore = () => {
        if (hasMore && !loading) {
            loadPointsLogs(page + 1);
        }
    };

    const pointsProgress = membershipInfo
        ? Math.min((membershipInfo.available_points / (membershipInfo.next_level_points || 1000)) * 100, 100)
        : 0;

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <AppHeader title="积分中心"/>

            {/* 积分概览 */}
            <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <div className="text-sm opacity-90 mb-1">可用积分</div>
                        <div className="text-4xl font-bold">
                            {membershipInfo?.available_points || 0}
                        </div>
                    </div>
                    <Star className="w-16 h-16 opacity-30"/>
                </div>

                {/* 会员等级进度 */}
                {membershipInfo && (
                    <div className="mt-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                            <span>{membershipInfo.level_name}</span>
                            <span>再得 {membershipInfo.next_level_points - membershipInfo.available_points} 积分升级</span>
                        </div>
                        <div className="h-2 bg-white/30 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-white rounded-full transition-all"
                                style={{width: `${pointsProgress}%`}}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* 快捷操作 */}
            <div className="bg-white mx-3 mt-4 rounded-xl p-4 shadow-sm">
                <div className="grid grid-cols-3 gap-4">
                    <button
                        onClick={handleSignin}
                        disabled={signinLoading}
                        className="flex flex-col items-center gap-2 py-3 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-blue-500"/>
                        </div>
                        <span className="text-sm text-gray-700">{signinLoading ? '签到中...' : '每日签到'}</span>
                    </button>

                    <button
                        onClick={() => router.push('/coupons')}
                        className="flex flex-col items-center gap-2 py-3 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                        <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                            <Gift className="w-6 h-6 text-orange-500"/>
                        </div>
                        <span className="text-sm text-gray-700">积分兑换</span>
                    </button>

                    <button
                        onClick={() => router.push('/help')}
                        className="flex flex-col items-center gap-2 py-3 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-green-500"/>
                        </div>
                        <span className="text-sm text-gray-700">积分规则</span>
                    </button>
                </div>
            </div>

            {/* 积分明细 */}
            <div className="mt-4 bg-white rounded-t-xl">
                <div className="p-4 border-b border-gray-100">
                    <h3 className="font-medium text-gray-800">积分明细</h3>
                </div>

                {pointsLogs.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <Star className="w-16 h-16 mx-auto mb-3 opacity-30"/>
                        <p>暂无积分记录</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {pointsLogs.map((log) => {
                            const typeInfo = pointsTypeMap[log.points_type] || {
                                label: log.points_type,
                                color: 'text-gray-500'
                            };
                            const isEarn = log.points > 0;

                            return (
                                <div key={log.id} className="p-4 flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span
                                                className={`text-xs px-2 py-0.5 rounded ${typeInfo.color} bg-opacity-10`}
                                                style={{backgroundColor: `${typeInfo.color.replace('text-', 'bg-')}`}}>
                                                {typeInfo.label}
                                            </span>
                                            {log.notes && (
                                                <span className="text-xs text-gray-500">{log.notes}</span>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-400">
                                            {new Date(log.created_at).toLocaleString('zh-CN')}
                                        </div>
                                    </div>
                                    <div className={`text-lg font-bold ${isEarn ? 'text-green-500' : 'text-red-500'}`}>
                                        {isEarn ? '+' : ''}{log.points}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* 加载更多 */}
                {hasMore && pointsLogs.length > 0 && (
                    <div className="p-4 text-center">
                        <button
                            onClick={handleLoadMore}
                            disabled={loading}
                            className="text-blue-500 text-sm hover:text-blue-600 disabled:opacity-50"
                        >
                            {loading ? '加载中...' : '加载更多'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

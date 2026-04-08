'use client';

import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import Image from 'next/image';
import {CreditCard, FileText, Gift, Headphones, HelpCircle, Info, LogOut, MapPin, Star, User} from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import {useUserStore} from '@/stores/user';
import {userApi} from '@/lib/api/user';

interface MembershipInfo {
    membership_level_name: string;
    available_points: number;
    total_points: number;
    next_level_info?: {
        points_needed: number;
        min_points: number;
    } | null;
    has_signed_in_today: boolean;
}

export default function ProfilePage() {
    const router = useRouter();
    const userStore = useUserStore();

    const [membershipInfo, setMembershipInfo] = useState<MembershipInfo | null>(null);
    const [orderStats, setOrderStats] = useState({
        pending: 0,
        preparing: 0,
        completed: 0
    });
    const [couponCount, setCouponCount] = useState(0);
    const [signinLoading, setSigninLoading] = useState(false);

    const defaultAvatar = 'https://img.yzcdn.cn/vant/user-active.png';

    // 加载会员信息和订单统计
    useEffect(() => {
        if (userStore.isLoggedIn) {
            loadMembershipInfo();
            loadOrderStats();
        }
    }, [userStore.isLoggedIn]);

    const loadMembershipInfo = async () => {
        try {
            const response = await userApi.getMembershipInfo();
            setMembershipInfo(response.data);
        } catch (error: any) {
            // 404 表示接口不存在或用户没有会员信息
            if (error.response?.status === 404) {
                console.log('会员信息接口未找到或用户没有会员信息');
            } else {
                console.error('加载会员信息失败:', error.message);
            }
        }
    };

    const loadOrderStats = async () => {
        try {
            const response = await userApi.getOrders();
            const orders = (response.data as any).results || response.data;
            setOrderStats({
                pending: orders.filter((o: any) => o.status === 'pending').length,
                preparing: orders.filter((o: any) => o.status === 'preparing').length,
                completed: orders.filter((o: any) => o.status === 'completed').length
            });
        } catch (error: any) {
            // 500 错误可能是服务器内部问题，静默处理
            if (error.response?.status === 500) {
                console.log('订单统计接口暂时不可用');
                // 设置默认值
                setOrderStats({pending: 0, preparing: 0, completed: 0});
            } else {
                console.error('加载订单统计失败:', error.message);
            }
        }
    };

    const formatPhone = (phone: string) => {
        if (!phone) return '';
        return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
    };

    const handleSignin = async () => {
        // 如果已经签到过，提示用户
        if (membershipInfo?.has_signed_in_today) {
            alert('今天已经签到过了');
            return;
        }

        setSigninLoading(true);
        try {
            const response = await userApi.signin();
            alert(`签到成功！获得${response.data.points_earned}积分`);
            await loadMembershipInfo();
        } catch (error: any) {
            // 如果是 400 错误（已签到），更新状态
            if (error.response?.status === 400) {
                alert(error.response?.data?.error || '今天已经签到过了');
                await loadMembershipInfo();
            } else {
                alert(error.response?.data?.error || '签到失败');
            }
        } finally {
            setSigninLoading(false);
        }
    };

    const handleLogout = () => {
        if (!confirm('确定要退出登录吗？')) {
            return;
        }

        userStore.logout();
        alert('已退出登录');
        router.push('/home');
    };

    const goToOrders = (status: string) => {
        router.push(`/order/list?status=${status}`);
    };

    const pointsProgress = membershipInfo && membershipInfo.next_level_info
        ? Math.min((membershipInfo.total_points / membershipInfo.next_level_info.min_points) * 100, 100)
        : 100;

    const userInfo = userStore.userInfo as any || {};

    return (
        <div className="min-h-screen bg-gray-50 pb-8">
            <AppHeader title="个人中心" showBack={false}/>

            {/* 用户信息头部 */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 flex items-center gap-4">
                <div className="w-16 h-16 rounded-full border-2 border-white overflow-hidden bg-white">
                    {userInfo.avatar ? (
                        <Image
                            src={userInfo.avatar}
                            alt={userInfo.username || '用户'}
                            width={64}
                            height={64}
                            className="object-cover w-full h-full"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <User className="w-8 h-8"/>
                        </div>
                    )}
                </div>
                <div className="flex-1">
                    <div className="text-xl font-bold text-white mb-1">
                        {userInfo.username || '未登录'}
                    </div>
                    {userInfo.phone && (
                        <div className="text-sm text-white/80">
                            {formatPhone(userInfo.phone)}
                        </div>
                    )}
                </div>
            </div>

            {/* 会员信息卡片 */}
            {userStore.isLoggedIn && membershipInfo && (
                <div className="bg-gradient-to-br from-yellow-50 to-white mx-3 mt-4 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
            <span
                className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-3 py-1 rounded-full text-sm font-bold">
              {membershipInfo.membership_level_name}
            </span>
                        <span className="text-orange-500 font-bold text-sm">
              可用积分：{membershipInfo.available_points}
            </span>
                    </div>
                    <div className="relative pt-4">
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full"
                                style={{width: `${pointsProgress}%`}}
                            />
                        </div>
                        <div className="text-center text-xs text-gray-500 mt-2">
                            {membershipInfo.next_level_info ? (
                                `再得 ${membershipInfo.next_level_info.points_needed} 积分升级`
                            ) : (
                                '已达最高等级'
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 我的订单 */}
            <div className="bg-white mx-3 mt-4 rounded-xl overflow-hidden">
                <div
                    className="p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                    onClick={() => router.push('/order/list')}
                >
                    <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-blue-500"/>
                        <span className="font-medium">我的订单</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400"/>
                </div>
                <div className="grid grid-cols-3 divide-x divide-gray-100">
                    <div
                        className="p-4 cursor-pointer hover:bg-gray-50 text-center"
                        onClick={() => goToOrders('pending')}
                    >
                        <div className="text-lg font-bold text-orange-500">{orderStats.pending}</div>
                        <div className="text-sm text-gray-500 mt-1">待支付</div>
                    </div>
                    <div
                        className="p-4 cursor-pointer hover:bg-gray-50 text-center"
                        onClick={() => goToOrders('preparing')}
                    >
                        <div className="text-lg font-bold text-blue-500">{orderStats.preparing}</div>
                        <div className="text-sm text-gray-500 mt-1">制作中</div>
                    </div>
                    <div
                        className="p-4 cursor-pointer hover:bg-gray-50 text-center"
                        onClick={() => goToOrders('completed')}
                    >
                        <div className="text-lg font-bold text-green-500">{orderStats.completed}</div>
                        <div className="text-sm text-gray-500 mt-1">待评价</div>
                    </div>
                </div>
            </div>

            {/* 资产相关 */}
            <div className="bg-white mx-3 mt-4 rounded-xl overflow-hidden">
                <div className="divide-y divide-gray-100">
                    <div
                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                        onClick={() => router.push('/coupons')}
                    >
                        <div className="flex items-center gap-3">
                            <CreditCard className="w-5 h-5 text-orange-500"/>
                            <span className="font-medium">优惠券</span>
                        </div>
                        <div className="flex items-center gap-2">
              <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-xs font-medium">
                {couponCount}张
              </span>
                            <ChevronRight className="w-5 h-5 text-gray-400"/>
                        </div>
                    </div>
                    <div
                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                        onClick={() => router.push('/points')}
                    >
                        <div className="flex items-center gap-3">
                            <Gift className="w-5 h-5 text-red-500"/>
                            <span className="font-medium">积分中心</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400"/>
                    </div>
                    <div
                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                        onClick={() => router.push('/products?shop_id=1')}
                    >
                        <div className="flex items-center gap-3">
                            <Star className="w-5 h-5 text-yellow-500"/>
                            <span className="font-medium">全部商品</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400"/>
                    </div>
                </div>
            </div>

            {/* 地址管理 */}
            <div className="bg-white mx-3 mt-4 rounded-xl overflow-hidden">
                <div
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                    onClick={() => router.push('/address')}
                >
                    <div className="flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-green-500"/>
                        <span className="font-medium">收货地址</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400"/>
                </div>
            </div>

            {/* 客服与帮助 */}
            <div className="bg-white mx-3 mt-4 rounded-xl overflow-hidden">
                <div className="divide-y divide-gray-100">
                    <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                            <Headphones className="w-5 h-5 text-blue-500"/>
                            <span className="font-medium">联系客服</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400"/>
                    </div>
                    <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                            <HelpCircle className="w-5 h-5 text-orange-500"/>
                            <span className="font-medium">帮助中心</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400"/>
                    </div>
                    <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                            <Info className="w-5 h-5 text-gray-500"/>
                            <span className="font-medium">关于我们</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400"/>
                    </div>
                </div>
            </div>

            {/* 签到按钮 */}
            {userStore.isLoggedIn && (
                <div className="mx-3 mt-6">
                    <button
                        onClick={handleSignin}
                        disabled={signinLoading || membershipInfo?.has_signed_in_today}
                        className={`w-full py-3 rounded-lg font-medium transition-colors ${
                            membershipInfo?.has_signed_in_today
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : signinLoading
                                    ? 'bg-blue-300 text-white opacity-50 cursor-not-allowed'
                                    : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                    >
                        {signinLoading ? '签到中...' : membershipInfo?.has_signed_in_today ? '今日已签到 ✓' : '每日签到'}
                    </button>
                </div>
            )}

            {/* 退出登录 */}
            {userStore.isLoggedIn && (
                <div className="mx-3 mt-4">
                    <button
                        onClick={handleLogout}
                        className="w-full py-3 border border-red-500 text-red-500 rounded-lg font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                    >
                        <LogOut className="w-5 h-5"/>
                        <span>退出登录</span>
                    </button>
                </div>
            )}
        </div>
    );
}

// ChevronRight 组件
function ChevronRight({className}: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
        >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6"/>
        </svg>
    );
}

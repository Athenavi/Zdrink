'use client';

import {Suspense, useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import apiClient from '@/lib/api';
import {ArrowRight, CheckCircle, Clock, ExternalLink, Loader2, Search, Store, XCircle} from 'lucide-react';

interface ApplyRecord {
    id: number;
    shop_name: string;
    shop_type: string;
    status: 'pending' | 'approved' | 'rejected';
    status_display: string;
    review_remark: string;
    setup_completed: boolean;
    setup_url: string | null;
    created_at: string;
    reviewed_at: string | null;
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
    pending: {label: '待审核', color: 'bg-yellow-100 text-yellow-700', icon: Clock},
    approved: {label: '已通过', color: 'bg-green-100 text-green-700', icon: CheckCircle},
    rejected: {label: '已拒绝', color: 'bg-red-100 text-red-700', icon: XCircle},
};

export default function MerchantStatusPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500"/>
        </div>}>
            <MerchantStatusContent/>
        </Suspense>
    );
}

function MerchantStatusContent() {
    const router = useRouter();
    const [phone, setPhone] = useState('');
    const [records, setRecords] = useState<ApplyRecord[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [error, setError] = useState('');

    const handleSearch = async () => {
        if (!phone || !/^1\d{10}$/.test(phone)) {
            setError('请输入正确的11位手机号');
            return;
        }

        setLoading(true);
        setError('');
        setSearched(true);

        try {
            const res = await apiClient.get('/shops/apply/', {params: {phone}});
            setRecords(res.data as ApplyRecord[]);
        } catch (err: any) {
            const msg = err.response?.data?.error || '查询失败，请重试';
            setError(msg);
            setRecords([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-600">
            {/* 顶部 */}
            <div className="text-center pt-12 pb-8 px-4">
                <h1 className="text-3xl font-bold text-white">入驻申请查询</h1>
                <p className="text-blue-100 mt-2">输入手机号查询您的申请进度</p>
            </div>

            <div className="max-w-lg mx-auto px-4 pb-12">
                {/* 搜索卡片 */}
                <div className="bg-white rounded-xl shadow-lg p-6 mb-4">
                    <div className="flex gap-2">
                        <input
                            type="tel"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            placeholder="请输入申请时填写的手机号"
                            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
                            maxLength={11}
                        />
                        <button
                            onClick={handleSearch}
                            disabled={loading}
                            className="px-5 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors flex items-center gap-2"
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin"/>
                            ) : (
                                <Search className="w-4 h-4"/>
                            )}
                            查询
                        </button>
                    </div>
                    {error && (
                        <p className="text-sm text-red-500 mt-2">{error}</p>
                    )}
                </div>

                {/* 查询结果 */}
                {searched && !loading && (
                    <div>
                        {records && records.length > 0 ? (
                            <div className="space-y-3">
                                {records.map(record => {
                                    const statusInfo = STATUS_MAP[record.status] || STATUS_MAP.pending;
                                    const StatusIcon = statusInfo.icon;

                                    return (
                                        <div key={record.id}
                                             className="bg-white rounded-xl shadow-lg p-5 hover:shadow-md transition-shadow">
                                            {/* 头部 */}
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <Store className="w-5 h-5 text-gray-500"/>
                                                    <span
                                                        className="font-medium text-gray-800">{record.shop_name}</span>
                                                </div>
                                                <span
                                                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${statusInfo.color}`}>
                                                    <StatusIcon className="w-3 h-3"/>
                                                    {record.status_display}
                                                </span>
                                            </div>

                                            {/* 审核备注 */}
                                            {record.review_remark && (
                                                <p className="text-sm text-gray-500 mb-3 bg-gray-50 rounded p-2">
                                                    {record.review_remark}
                                                </p>
                                            )}

                                            {/* 时间 */}
                                            <div className="text-xs text-gray-400 mb-3">
                                                申请时间：{new Date(record.created_at).toLocaleString('zh-CN')}
                                                {record.reviewed_at && (
                                                    <> ·
                                                        审核时间：{new Date(record.reviewed_at).toLocaleString('zh-CN')}</>
                                                )}
                                            </div>

                                            {/* 操作按钮 */}
                                            <div className="flex gap-2">
                                                {record.status === 'approved' && !record.setup_completed && record.setup_url && (
                                                    <Link
                                                        href={record.setup_url}
                                                        className="flex-1 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-1.5"
                                                    >
                                                        <ExternalLink className="w-4 h-4"/>
                                                        去设置店铺
                                                        <ArrowRight className="w-4 h-4"/>
                                                    </Link>
                                                )}
                                                {record.status === 'approved' && record.setup_completed && (
                                                    <div
                                                        className="flex-1 py-2.5 bg-green-50 text-green-700 rounded-lg text-sm text-center">
                                                        ✓ 设置已完成，请登录管理后台
                                                    </div>
                                                )}
                                                {record.status === 'pending' && (
                                                    <div
                                                        className="flex-1 py-2.5 bg-gray-50 text-gray-500 rounded-lg text-sm text-center">
                                                        请耐心等待审核
                                                    </div>
                                                )}
                                                {record.status === 'rejected' && (
                                                    <Link
                                                        href="/register/merchant"
                                                        className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors text-center"
                                                    >
                                                        重新申请
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                                <Search className="w-12 h-12 text-gray-300 mx-auto mb-3"/>
                                <p className="text-gray-500 mb-2">未找到入驻申请记录</p>
                                <p className="text-sm text-gray-400 mb-4">
                                    请确认手机号是否正确，或
                                </p>
                                <Link
                                    href="/register/merchant"
                                    className="inline-block px-6 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                                >
                                    去申请入驻
                                </Link>
                            </div>
                        )}

                        {/* 底部导航 */}
                        <div className="flex justify-center gap-4 mt-4">
                            <Link
                                href="/register/merchant"
                                className="text-sm text-blue-100 hover:text-white transition-colors"
                            >
                                申请入驻
                            </Link>
                            <span className="text-blue-200">|</span>
                            <Link
                                href="/login"
                                className="text-sm text-blue-100 hover:text-white transition-colors"
                            >
                                登录
                            </Link>
                        </div>
                    </div>
                )}

                {/* 初始状态 */}
                {!searched && (
                    <div className="bg-white/10 rounded-xl p-6 text-center">
                        <Store className="w-10 h-10 text-blue-200 mx-auto mb-3"/>
                        <p className="text-blue-100 text-sm">
                            输入申请时填写的手机号，即可查询入驻申请的审核进度和设置入口
                        </p>
                        <Link
                            href="/register/merchant"
                            className="inline-block mt-4 px-5 py-2 bg-white/20 text-white rounded-lg text-sm hover:bg-white/30 transition-colors"
                        >
                            还没有申请？去入驻
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}

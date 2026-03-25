'use client';

import {useEffect, useState} from 'react';
import {AlertCircle, CheckCircle, Clock, Play, Printer, RefreshCw} from 'lucide-react';
import {printingApi} from '@/lib/api/printing';

interface PrintTask {
    id: number;
    printer_name: string;
    content_type_text: string;
    copies: number;
    status: 'pending' | 'printing' | 'completed' | 'failed';
    created_at: string;
    printed_at?: string;
    print_content?: string;
    error_message?: string;
}

type TabType = 'all' | 'pending' | 'printing' | 'completed' | 'failed';

export default function PrintQueuePage() {
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('all');
    const [printTasks, setPrintTasks] = useState<PrintTask[]>([]);
    const [showPreview, setShowPreview] = useState(false);
    const [previewData, setPreviewData] = useState<{ taskId: number; content: string } | null>(null);

    useEffect(() => {
        loadPrintTasks();
    }, [activeTab]);

    const loadPrintTasks = async () => {
        setLoading(true);
        try {
            const params = activeTab !== 'all' ? {status: activeTab} : {};
            const response = await printingApi.getPrintTasks(params);
            setPrintTasks((response.data as any).results || response.data || []);
        } catch (error) {
            console.error('加载打印任务失败:', error);
            alert('加载失败');
        } finally {
            setLoading(false);
        }
    };

    const handleRetry = async (task: PrintTask) => {
        if (!confirm(`确定要重打打印任务 #${task.id} 吗？`)) {
            return;
        }

        try {
            await printingApi.retryPrintTask(task.id);
            alert('已重新提交打印任务');
            await loadPrintTasks();
        } catch (error) {
            console.error('重试失败:', error);
            alert('重试失败');
        }
    };

    const handlePreview = (task: PrintTask) => {
        setPreviewData({
            taskId: task.id,
            content: task.print_content || '打印内容预览'
        });
        setShowPreview(true);
    };

    const handlePrintFromPreview = () => {
        alert('开始打印...');
        setShowPreview(false);
    };

    const getStatusType = (status: string) => {
        const typeMap: Record<string, string> = {
            pending: 'warning',
            printing: 'primary',
            completed: 'success',
            failed: 'danger'
        };
        return typeMap[status] || 'default';
    };

    const getStatusText = (status: string) => {
        const textMap: Record<string, string> = {
            pending: '待打印',
            printing: '打印中',
            completed: '已完成',
            failed: '失败'
        };
        return textMap[status] || status;
    };

    const formatTime = (timeString: string) => {
        if (!timeString) return '';
        return new Date(timeString).toLocaleString();
    };

    const tabs = [
        {id: 'all', label: '全部'},
        {id: 'pending', label: '待打印'},
        {id: 'printing', label: '打印中'},
        {id: 'completed', label: '已完成'},
        {id: 'failed', label: '失败'}
    ] as const;

    return (
        <div className="min-h-screen bg-gray-100 pb-8">
            {/* 头部 */}
            <div className="bg-white shadow-sm sticky top-0 z-10">
                <div className="max-w-3xl mx-auto px-4 py-4">
                    <h1 className="text-xl font-bold text-gray-800">打印队列</h1>
                </div>
            </div>

            {/* 筛选栏 */}
            <div className="bg-white border-b border-gray-200 sticky top-[60px] z-10">
                <div className="max-w-3xl mx-auto">
                    <div className="flex overflow-x-auto scrollbar-hide">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-shrink-0 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                                    activeTab === tab.id
                                        ? 'border-blue-500 text-blue-500'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 打印任务列表 */}
            <div className="max-w-3xl mx-auto px-4 mt-4">
                {loading ? (
                    <div className="text-center py-12">
                        <RefreshCw className="w-8 h-8 mx-auto mb-3 text-blue-500 animate-spin"/>
                        <p className="text-gray-500">加载中...</p>
                    </div>
                ) : printTasks.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl">
                        <Printer className="w-16 h-16 mx-auto mb-3 text-gray-300"/>
                        <p className="text-gray-500">暂无打印任务</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {printTasks.map((task) => (
                            <div
                                key={task.id}
                                onClick={() => handlePreview(task)}
                                className={`bg-white rounded-xl p-4 cursor-pointer hover:shadow-md transition-all border-l-4 ${
                                    task.status === 'pending' ? 'border-orange-500' :
                                        task.status === 'printing' ? 'border-blue-500' :
                                            task.status === 'completed' ? 'border-green-500' :
                                                'border-red-500'
                                }`}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-500">#{task.id}</span>
                                        <span className={`px-2 py-0.5 text-xs rounded ${
                                            task.status === 'completed' ? 'bg-green-100 text-green-600' :
                                                task.status === 'pending' ? 'bg-orange-100 text-orange-600' :
                                                    task.status === 'printing' ? 'bg-blue-100 text-blue-600' :
                                                        'bg-red-100 text-red-600'
                                        }`}>
                      {getStatusText(task.status)}
                    </span>
                                    </div>
                                    {task.status === 'failed' && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRetry(task);
                                            }}
                                            className="p-2 text-blue-500 hover:bg-blue-50 rounded transition-colors"
                                        >
                                            <RefreshCw className="w-5 h-5"/>
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <Printer className="w-4 h-4 text-gray-400"/>
                                        <span className="font-medium">打印机:</span>
                                        <span>{task.printer_name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <AlertCircle className="w-4 h-4 text-gray-400"/>
                                        <span className="font-medium">打印内容:</span>
                                        <span>{task.content_type_text}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <CheckCircle className="w-4 h-4 text-gray-400"/>
                                        <span className="font-medium">份数:</span>
                                        <span>{task.copies}份</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <Clock className="w-4 h-4 text-gray-400"/>
                                        <span className="font-medium">创建时间:</span>
                                        <span>{formatTime(task.created_at)}</span>
                                    </div>
                                    {task.printed_at && (
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <Play className="w-4 h-4 text-gray-400"/>
                                            <span className="font-medium">打印时间:</span>
                                            <span>{formatTime(task.printed_at)}</span>
                                        </div>
                                    )}
                                </div>

                                {task.status === 'failed' && task.error_message && (
                                    <div className="mt-3 p-3 bg-red-50 rounded flex items-start gap-2">
                                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"/>
                                        <div className="flex-1 text-xs text-red-600">
                                            <span className="font-medium">错误信息：</span>
                                            {task.error_message}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 打印预览弹窗 */}
            {showPreview && previewData && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
                        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                            <h3 className="text-lg font-semibold">打印预览</h3>
                            <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-gray-600">
                                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                     strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>

                        <div className="p-4 overflow-y-auto flex-1">
                            <div
                                className="p-4 bg-gray-50 rounded font-mono text-sm text-gray-700 whitespace-pre-wrap border border-gray-200">
                                {previewData.content}
                            </div>
                        </div>

                        <div className="px-4 py-3 border-t border-gray-200">
                            <button
                                onClick={handlePrintFromPreview}
                                className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                            >
                                立即打印
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

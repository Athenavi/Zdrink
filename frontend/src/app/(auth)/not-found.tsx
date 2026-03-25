'use client';

import {useRouter} from 'next/navigation';
import {AlertCircle, Home} from 'lucide-react';
import AppHeader from '@/components/AppHeader';

export default function NotFoundPage() {
    const router = useRouter();

    const goHome = () => {
        router.push('/home');
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <AppHeader title="页面不存在"/>

            <div className="flex-1 flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    {/* 404 图标 */}
                    <div className="w-40 h-40 mx-auto mb-6 text-red-500">
                        <AlertCircle className="w-full h-full"/>
                    </div>

                    {/* 错误信息 */}
                    <h1 className="text-6xl font-bold text-gray-800 mb-2">404</h1>
                    <p className="text-xl text-gray-600 mb-8">抱歉，页面不存在</p>

                    {/* 返回首页按钮 */}
                    <button
                        onClick={goHome}
                        className="inline-flex items-center gap-2 px-8 py-3.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium shadow-lg"
                    >
                        <Home className="w-5 h-5"/>
                        <span>返回首页</span>
                    </button>

                    {/* 提示信息 */}
                    <div className="mt-8 text-sm text-gray-500">
                        <p>您可能输入了错误的网址</p>
                        <p>或者该页面已被删除或移动</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

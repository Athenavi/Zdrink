'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {ChevronDown, ChevronUp, Clock, Phone, QrCode, ShieldCheck, ShoppingCart, Star, Truck} from 'lucide-react';
import AppHeader from '@/components/AppHeader';

interface HelpCategory {
    id: number;
    name: string;
    description: string;
    icon: any;
    color: string;
}

interface FAQ {
    id: number;
    question: string;
    answer: string;
}

export default function HelpPage() {
    const router = useRouter();
    const [activeQuestions, setActiveQuestions] = useState<number[]>([]);
    const [feedbackContent, setFeedbackContent] = useState('');
    const [feedbackFiles, setFeedbackFiles] = useState<File[]>([]);

    const helpCategories: HelpCategory[] = [
        {
            id: 1,
            name: '下单支付',
            description: '下单、支付相关问题',
            icon: ShoppingCart,
            color: '#1989fa'
        },
        {
            id: 2,
            name: '配送说明',
            description: '配送范围、时间相关问题',
            icon: Truck,
            color: '#07c160'
        },
        {
            id: 3,
            name: '售后服务',
            description: '退款、退货相关问题',
            icon: ShieldCheck,
            color: '#ee0a24'
        },
        {
            id: 4,
            name: '账户安全',
            description: '登录、注册、密码相关问题',
            icon: ShieldCheck,
            color: '#7232dd'
        },
        {
            id: 5,
            name: '积分会员',
            description: '积分、会员等级相关问题',
            icon: Star,
            color: '#ffd21e'
        }
    ];

    const faqList: FAQ[] = [
        {
            id: 1,
            question: '如何下单？',
            answer: '选择商品后加入购物车，点击结算按钮，填写配送信息并选择支付方式，确认订单后完成支付即可。'
        },
        {
            id: 2,
            question: '支持哪些支付方式？',
            answer: '目前支持微信支付、支付宝支付、余额支付等多种支付方式。'
        },
        {
            id: 3,
            question: '多久可以送达？',
            answer: '一般情况下，订单会在 30-60 分钟内送达，具体以店铺实际配送时间为准。'
        },
        {
            id: 4,
            question: '如何申请退款？',
            answer: '在订单详情页点击"申请售后"，选择退款原因并提交申请，商家审核后会为您处理退款。'
        },
        {
            id: 5,
            question: '积分如何获得？',
            answer: '消费可获得积分（1 元=1 积分），每日签到也可获得积分，邀请好友注册同样有积分奖励。'
        },
        {
            id: 6,
            question: '积分如何使用？',
            answer: '积分可在积分商城兑换商品，或在支付时抵扣现金（100 积分=1 元）。'
        }
    ];

    const toggleQuestion = (id: number) => {
        setActiveQuestions(prev =>
            prev.includes(id) ? prev.filter(q => q !== id) : [...prev, id]
        );
    };

    const goToCategory = (category: HelpCategory) => {
        router.push(`/help/category?id=${category.id}&name=${category.name}`);
    };

    const callService = () => {
        window.location.href = 'tel:400-123-4567';
    };

    const copyWechat = async () => {
        try {
            await navigator.clipboard.writeText('zdrink_service');
            alert('已复制微信号');
        } catch {
            alert('复制失败，请手动添加：zdrink_service');
        }
    };

    const submitFeedback = async () => {
        if (!feedbackContent || !feedbackContent.trim()) {
            alert('请填写反馈内容');
            return;
        }

        try {
            // TODO: 调用 API 提交反馈
            console.log('提交反馈:', {
                content: feedbackContent,
                files: feedbackFiles
            });

            alert('反馈提交成功，我们会尽快处理');
            setFeedbackContent('');
            setFeedbackFiles([]);
        } catch (error) {
            alert('提交失败，请稍后重试');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-8">
            <AppHeader title="帮助中心" showBack={true}/>

            {/* 常见问题分类 */}
            <div className="bg-white mx-3 mt-3 rounded-xl overflow-hidden p-4">
                <div className="space-y-3">
                    {helpCategories.map((category) => {
                        const IconComponent = category.icon;
                        return (
                            <div
                                key={category.id}
                                onClick={() => goToCategory(category)}
                                className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 -mx-2 rounded-lg transition-colors"
                            >
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                                     style={{backgroundColor: `${category.color}20`}}>
                                    <IconComponent className="w-5 h-5" style={{color: category.color}}/>
                                </div>
                                <div className="flex-1">
                                    <div className="font-medium text-base">{category.name}</div>
                                    <div className="text-sm text-gray-500 mt-0.5">{category.description}</div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-400"/>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 常见问题列表 */}
            <div className="bg-white mx-3 mt-3 rounded-xl overflow-hidden p-4">
                <h3 className="text-lg font-semibold mb-4">常见问题</h3>
                <div className="space-y-2">
                    {faqList.map((faq) => {
                        const isActive = activeQuestions.includes(faq.id);
                        return (
                            <div key={faq.id} className="border border-gray-200 rounded-lg overflow-hidden">
                                <button
                                    onClick={() => toggleQuestion(faq.id)}
                                    className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
                                >
                                    <span className="font-medium text-sm text-left">{faq.question}</span>
                                    {isActive ? (
                                        <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0"/>
                                    ) : (
                                        <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0"/>
                                    )}
                                </button>
                                {isActive && (
                                    <div className="px-4 py-3 text-sm text-gray-600 leading-relaxed bg-white">
                                        {faq.answer}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 联系客服 */}
            <div className="bg-white mx-3 mt-3 rounded-xl overflow-hidden p-4">
                <h3 className="text-lg font-semibold mb-4">联系我们</h3>
                <div className="space-y-1 divide-y divide-gray-100">
                    <button
                        onClick={callService}
                        className="w-full flex items-center justify-between py-3 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <Phone className="w-5 h-5 text-blue-500"/>
                            <span className="font-medium">客服热线</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-600">400-123-4567</span>
                            <ChevronRight className="w-5 h-5 text-gray-400"/>
                        </div>
                    </button>
                    <button
                        onClick={copyWechat}
                        className="w-full flex items-center justify-between py-3 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <QrCode className="w-5 h-5 text-green-600"/>
                            <span className="font-medium">官方微信</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-600">zdrink_service</span>
                            <ChevronRight className="w-5 h-5 text-gray-400"/>
                        </div>
                    </button>
                    <div className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                            <Clock className="w-5 h-5 text-gray-400"/>
                            <span className="font-medium">服务时间</span>
                        </div>
                        <span className="text-gray-600">9:00 - 21:00</span>
                    </div>
                </div>
            </div>

            {/* 意见反馈 */}
            <div className="bg-white mx-3 mt-3 rounded-xl overflow-hidden p-4">
                <h3 className="text-lg font-semibold mb-4">意见反馈</h3>
                <textarea
                    value={feedbackContent}
                    onChange={(e) => setFeedbackContent(e.target.value)}
                    placeholder="请描述您遇到的问题或建议..."
                    maxLength={500}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 resize-none text-sm"
                />
                <div className="text-xs text-gray-400 text-right mt-1">
                    {feedbackContent.length}/500
                </div>

                {/* 图片上传 */}
                <div className="mt-3">
                    <label className="text-sm text-gray-600 mb-2 block">上传图片（最多 3 张）</label>
                    <input
                        type="file"
                        multiple
                        accept="image/*"
                        max={3}
                        onChange={(e) => {
                            const files = e.target.files ? Array.from(e.target.files).slice(0, 3) : [];
                            setFeedbackFiles(files);
                        }}
                        className="text-sm"
                    />
                    {feedbackFiles.length > 0 && (
                        <div className="flex gap-2 mt-2">
                            {feedbackFiles.map((file, index) => (
                                <div key={index} className="relative w-20 h-20 bg-gray-100 rounded-lg overflow-hidden">
                                    <img
                                        src={URL.createObjectURL(file)}
                                        alt={`Preview ${index}`}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <button
                    onClick={submitFeedback}
                    className="w-full mt-4 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                >
                    提交反馈
                </button>
            </div>
        </div>
    );
}

function ChevronRight({className}: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6"/>
        </svg>
    );
}

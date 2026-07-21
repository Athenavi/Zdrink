'use client';

import {Suspense, useCallback, useEffect, useRef, useState} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import Link from 'next/link';
import {useUserStore} from '@/stores/user';
import apiClient from '@/lib/api';
import CaptchaButton, {useCaptcha} from '@/components/CaptchaButton';

type LoginTab = 'password' | 'code';

export default function LoginPage() {
    return (
        <Suspense fallback={<div
            className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <div className="text-white text-xl">加载中...</div>
        </div>}>
            <LoginContent/>
        </Suspense>
    );
}

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const login = useUserStore((state) => state.login);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // 密码登录
    const [formData, setFormData] = useState({
        username: '',
        password: ''
    });

    // 验证码登录
    const [loginTab, setLoginTab] = useState<LoginTab>('password');
    const [codeTarget, setCodeTarget] = useState<'phone' | 'email'>('phone');
    const [codePhone, setCodePhone] = useState('');
    const [codeEmail, setCodeEmail] = useState('');
    const [codeValue, setCodeValue] = useState('');
    const [countdown, setCountdown] = useState(0);
    const [loginMode, setLoginMode] = useState<{
        enabled: boolean;
        phone: boolean;
        email: boolean;
        mode: string;
    } | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const captcha = useCaptcha();

    // 获取登录模式配置
    useEffect(() => {
        apiClient.get('/auth/login-mode/').then(res => {
            setLoginMode(res.data);
        }).catch(() => {
            setLoginMode({enabled: false, phone: false, email: false, mode: 'any'});
        });
    }, []);

    // 倒计时清理
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    // 发送验证码
    const handleSendCode = useCallback(async () => {
        const target = codePhone || codeEmail;
        if (!target) {
            setError('请先输入手机号或邮箱');
            return;
        }

        // 启用了人机验证但尚未验证 → 自动触发
        if (captcha.result?.provider !== 'none' && !captcha.isVerified) {
            const ok = await captcha.execute();
            if (!ok) {
                setError('请先完成人机验证');
                return;
            }
        }

        setLoading(true);
        setError('');
        try {
            const body: Record<string, any> = {
                phone: codePhone,
                email: codeEmail,
                purpose: 'login',
            };
            if (captcha.result && captcha.result.provider !== 'none') {
                body.captcha_provider = captcha.result.provider;
                if (captcha.result.lot_number) body.lot_number = captcha.result.lot_number;
                if (captcha.result.captcha_output) body.captcha_output = captcha.result.captcha_output;
                if (captcha.result.pass_token) body.pass_token = captcha.result.pass_token;
                if (captcha.result.gen_time) body.gen_time = captcha.result.gen_time;
            }
            await apiClient.post('/auth/send-code/', body);
            // 开始倒计时
            setCountdown(60);
            timerRef.current = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        if (timerRef.current) clearInterval(timerRef.current);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } catch (err: any) {
            const msg = err.response?.data?.non_field_errors?.[0]
                || err.response?.data?.detail
                || err.response?.data?.message
                || '发送验证码失败';
            setError(msg);
        } finally {
            setLoading(false);
        }
    }, [codePhone, codeEmail, captcha]);

    // 验证码登录
    const handleCodeLogin = useCallback(async () => {
        if (!codeValue) {
            setError('请输入验证码');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await apiClient.post('/auth/login-by-code/', {
                phone: codePhone,
                email: codeEmail,
                code: codeValue,
            });
            const {access, refresh, user} = res.data;
            // 设置 token 和用户信息
            useUserStore.getState().setToken(access);
            document.cookie = `refresh_token=${refresh}; path=/; max-age=${60 * 60 * 24 * 30}`;
            useUserStore.setState({userInfo: user});
            const callbackUrl = searchParams.get('callbackUrl') || searchParams.get('redirect') || '/home';
            router.push(callbackUrl);
        } catch (err: any) {
            const msg = err.response?.data?.non_field_errors?.[0]
                || err.response?.data?.detail
                || err.response?.data?.message
                || '验证码登录失败';
            setError(msg);
        } finally {
            setLoading(false);
        }
    }, [codePhone, codeEmail, codeValue, router, searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            console.log('尝试登录，用户名:', formData.username);
            await login(formData);
            // 登录成功，跳转到目标页面
            const callbackUrl = searchParams.get('callbackUrl') || searchParams.get('redirect') || '/home';
            router.push(callbackUrl);
        } catch (err: any) {
            console.error('登录失败:', err);
            console.error('错误响应:', err.response);
            console.error('错误数据:', err.response?.data);

            // 尝试获取具体的错误信息
            let errorMsg = '登录失败，请检查用户名和密码';

            if (err.response?.data) {
                const errorData = err.response.data;
                // 处理 Django REST Framework 的错误格式
                if (errorData.non_field_errors) {
                    errorMsg = errorData.non_field_errors[0];
                } else if (errorData.detail) {
                    errorMsg = errorData.detail;
                } else if (typeof errorData === 'object') {
                    // 处理字段级别的错误
                    const firstField = Object.keys(errorData)[0];
                    if (firstField && errorData[firstField][0]) {
                        errorMsg = errorData[firstField][0];
                    }
                }
            }

            if (err.response?.data) {
                const errorData = err.response.data;
                // Django DRF 可能返回字段级别的错误
                if (typeof errorData === 'object') {
                    // 尝试获取 username 或 password 字段的错误
                    errorMsg = errorData.username?.[0]
                        || errorData.password?.[0]
                        || errorData.detail
                        || errorData.message
                        || JSON.stringify(errorData);
                } else if (typeof errorData === 'string') {
                    errorMsg = errorData;
                }
            } else if (err.message) {
                errorMsg = err.message;
            }

            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    // 微信登录
    const handleWeixinLogin = () => {
        if (!process.env.NEXT_PUBLIC_WEIXIN_APP_ID) {
            setError('微信登录未配置（缺少 NEXT_PUBLIC_WEIXIN_APP_ID）');
            return;
        }
        const redirectUri = encodeURIComponent(`${window.location.origin}/auth/callback/weixin`);
        const authUrl = `https://open.weixin.qq.com/connect/qrconnect?appid=${process.env.NEXT_PUBLIC_WEIXIN_APP_ID}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_login&state=STATE#wechat_redirect`;
        window.location.href = authUrl;
    };

    // 支付宝登录
    const handleAlipayLogin = () => {
        if (!process.env.NEXT_PUBLIC_ALIPAY_APP_ID) {
            setError('支付宝登录未配置（缺少 NEXT_PUBLIC_ALIPAY_APP_ID）');
            return;
        }
        const redirectUri = encodeURIComponent(`${window.location.origin}/auth/callback/alipay`);
        const authUrl = `https://openauth.alipay.com/oauth2/publicAppAuthorize.htm?app_id=${process.env.NEXT_PUBLIC_ALIPAY_APP_ID}&scope=auth_user&redirect_uri=${redirectUri}`;
        window.location.href = authUrl;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-10">
                    <div className="inline-block">
                        <img
                            src="/logo.svg"
                            alt="Zdrink Logo"
                            className="w-20 h-20 mx-auto"
                        />
                    </div>
                    <h1 className="text-3xl font-bold text-white mt-4">Zdrink点餐</h1>
                </div>

                {/* 登录表单 */}
                <div className="bg-white rounded-lg shadow-xl p-8">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
                        用户登录
                    </h2>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {/* 注册成功提示 */}
                    {searchParams.get('registered') && (
                        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-600 rounded-lg text-sm">
                            注册成功，请登录
                        </div>
                    )}

                    {/* 登录方式 Tab */}
                    {loginMode?.enabled && (
                        <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
                            <button
                                onClick={() => setLoginTab('password')}
                                className={`flex-1 py-2 text-sm rounded-md font-medium transition-colors ${
                                    loginTab === 'password'
                                        ? 'bg-white text-blue-600 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                密码登录
                            </button>
                            <button
                                onClick={() => setLoginTab('code')}
                                className={`flex-1 py-2 text-sm rounded-md font-medium transition-colors ${
                                    loginTab === 'code'
                                        ? 'bg-white text-blue-600 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                验证码登录
                            </button>
                        </div>
                    )}

                    {/* 密码登录表单 */}
                    {loginTab === 'password' && (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="username"
                                       className="block text-sm font-medium text-gray-700 mb-1">
                                    用户名
                                </label>
                                <input
                                    id="username"
                                    type="text"
                                    value={formData.username}
                                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                                    placeholder="请输入用户名（例如：admin）"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                                <p className="mt-1 text-xs text-gray-500">测试账号：admin / admin123456</p>
                            </div>

                            <div>
                                <label htmlFor="password"
                                       className="block text-sm font-medium text-gray-700 mb-1">
                                    密码
                                </label>
                                <input
                                    id="password"
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                                    placeholder="请输入密码"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full py-3 px-4 rounded-lg text-white font-medium transition-colors ${
                                    loading
                                        ? 'bg-blue-400 cursor-not-allowed'
                                        : 'bg-blue-500 hover:bg-blue-600'
                                }`}
                            >
                                {loading ? '登录中...' : '登录'}
                            </button>
                        </form>
                    )}

                    {/* 验证码登录表单 */}
                    {loginTab === 'code' && (
                        <div className="space-y-4">
                            {/* 方式选择（仅 any 模式显示切换） */}
                            {loginMode?.mode === 'any' && (
                                <div className="flex bg-gray-100 rounded-lg p-0.5">
                                    <button
                                        onClick={() => {
                                            setCodeTarget('phone');
                                            setCodeEmail('');
                                        }}
                                        className={`flex-1 py-1.5 text-sm rounded-md font-medium transition-colors ${
                                            codeTarget === 'phone'
                                                ? 'bg-white text-blue-600 shadow-sm'
                                                : 'text-gray-500'
                                        }`}
                                    >
                                        手机号登录
                                    </button>
                                    <button
                                        onClick={() => {
                                            setCodeTarget('email');
                                            setCodePhone('');
                                        }}
                                        className={`flex-1 py-1.5 text-sm rounded-md font-medium transition-colors ${
                                            codeTarget === 'email'
                                                ? 'bg-white text-blue-600 shadow-sm'
                                                : 'text-gray-500'
                                        }`}
                                    >
                                        邮箱登录
                                    </button>
                                </div>
                            )}

                            {/* 手机号（phone_only 或 any+phone 时显示） */}
                            {(loginMode?.mode === 'phone_only' ||
                                (loginMode?.mode === 'any' && codeTarget === 'phone')) && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        手机号
                                    </label>
                                    <input
                                        type="tel"
                                        value={codePhone}
                                        onChange={e => setCodePhone(e.target.value)}
                                        placeholder="请输入手机号"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            )}
                            {/* 邮箱（email_only 或 any+email 时显示） */}
                            {(loginMode?.mode === 'email_only' ||
                                (loginMode?.mode === 'any' && codeTarget === 'email')) && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        邮箱
                                    </label>
                                    <input
                                        type="email"
                                        value={codeEmail}
                                        onChange={e => setCodeEmail(e.target.value)}
                                        placeholder="请输入邮箱"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            )}
                            {/* 验证码 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    验证码
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={codeValue}
                                        onChange={e => setCodeValue(e.target.value)}
                                        placeholder="请输入验证码"
                                        maxLength={6}
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                    <button
                                        onClick={handleSendCode}
                                        disabled={loading || countdown > 0 || (!codePhone && !codeEmail)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                                            countdown > 0
                                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                                : 'bg-blue-500 text-white hover:bg-blue-600'
                                        } disabled:opacity-50`}
                                    >
                                        {countdown > 0 ? `${countdown}s` : '发送验证码'}
                                    </button>
                                </div>
                            </div>

                            {/* 人机验证 */}
                            <CaptchaButton captcha={captcha}/>

                            <button
                                onClick={handleCodeLogin}
                                disabled={loading || !codeValue}
                                className={`w-full py-3 px-4 rounded-lg text-white font-medium transition-colors ${
                                    loading
                                        ? 'bg-blue-400 cursor-not-allowed'
                                        : 'bg-blue-500 hover:bg-blue-600'
                                } disabled:opacity-50`}
                            >
                                {loading ? '登录中...' : '登录'}
                            </button>
                        </div>
                    )}

                    {/* 第三方登录 */}
                    <div className="mt-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-gray-500">或使用以下方式登录</span>
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                            <button
                                onClick={() => handleWeixinLogin()}
                                className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-green-50 transition-colors"
                            >
                                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="#07C160">
                                    <path
                                        d="M8.5,13.5A1.5,1.5 0 1,0 7,15A1.5,1.5 0 0,0 8.5,13.5M14.5,13.5A1.5,1.5 0 1,0 13,15A1.5,1.5 0 0,0 14.5,13.5M12,2C6.48,2 2,6.03 2,11C2,13.66 3.44,16.07 5.79,17.69C5.5,18.5 5,20.5 5,20.5C5,20.5 7.5,19.5 9,19C10,19.33 11,19.5 12,19.5C17.52,19.5 22,15.47 22,10.5C22,5.53 17.52,2 12,2Z"/>
                                </svg>
                                <span className="text-sm font-medium text-gray-700">微信登录</span>
                            </button>
                            <button
                                onClick={() => handleAlipayLogin()}
                                className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-blue-50 transition-colors"
                            >
                                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="#1677FF">
                                    <path
                                        d="M12,2C6.48,2 2,6.48 2,12C2,17.52 6.48,22 12,22C17.52,22 22,17.52 22,12C22,6.48 17.52,2 12,2M17.5,14H14V17.5H10V14H6.5V10H10V6.5H14V10H17.5V14Z"/>
                                </svg>
                                <span className="text-sm font-medium text-gray-700">支付宝登录</span>
                            </button>
                        </div>
                    </div>

                    {/* 链接 */}
                    <div className="mt-6 text-center space-y-2">
                        <div className="flex items-center justify-center space-x-4">
                            <Link
                                href="/register"
                                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                            >
                                立即注册
                            </Link>
                            <span className="text-gray-300">|</span>
                            <a
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    alert('请联系管理员重置密码');
                                }}
                                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                            >
                                忘记密码
                            </a>
                        </div>
                        <p className="text-xs text-gray-400">
                            想成为商家？
                            <Link
                                href="/register/merchant"
                                className="text-blue-500 hover:text-blue-600 font-medium ml-1"
                            >
                                商家入驻
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

'use client';

import {useEffect, useRef, useState} from 'react';
import {Loader2, ShieldAlert, ShieldCheck} from 'lucide-react';
import apiClient from '@/lib/api';

interface CaptchaResult {
    provider: string;
    lot_number?: string;
    captcha_output?: string;
    pass_token?: string;
    gen_time?: string;
    ticket?: string;
    randstr?: string;
    session_id?: string;
    sig?: string;
    token?: string;
    scene?: string;
    validate?: string;
}

interface CaptchaConfig {
    provider: string;
    active: boolean;
    captcha_id?: string;
    app_id?: string;
    app_key?: string;
}

export interface CaptchaHandle {
    isVerified: boolean;
    result: CaptchaResult | null;
    execute: () => Promise<CaptchaResult | null>;
    reset: () => void;
}

/**
 * 人机验证 Hook — 按需加载 SDK，管理验证状态
 */
export function useCaptcha(): CaptchaHandle {
    const [config, setConfig] = useState<CaptchaConfig | null>(null);
    const [isVerified, setIsVerified] = useState(false);
    const [result, setResult] = useState<CaptchaResult | null>(null);
    const [sdkReady, setSdkReady] = useState(false);
    const geetestRef = useRef<any>(null);
    const sdkLoadedRef = useRef(false);

    // 1. 加载配置
    useEffect(() => {
        apiClient.get('/auth/captcha-config/').then(res => {
            setConfig(res.data);
        }).catch(() => {
            setConfig({provider: 'none', active: false});
        });
    }, []);

    // 2. 按需加载极验 SDK（只在 geetest 启用时加载）
    useEffect(() => {
        if (!config || config.provider !== 'geetest' || !config.active) return;
        if (sdkLoadedRef.current) return;
        sdkLoadedRef.current = true;

        const script = document.createElement('script');
        script.src = 'https://static.geetest.com/v4/gt4.js';
        script.async = true;
        script.onload = () => setSdkReady(true);
        script.onerror = () => {
            console.error('极验 SDK 加载失败');
            sdkLoadedRef.current = false;
        };
        document.body.appendChild(script);

        return () => {
            if (script.parentNode) script.parentNode.removeChild(script);
            sdkLoadedRef.current = false;
        };
    }, [config]);

    // 3. 执行验证
    const execute = (): Promise<CaptchaResult | null> => {
        return new Promise((resolve) => {
            if (!config || !config.active || config.provider === 'none') {
                setIsVerified(true);
                const r: CaptchaResult = {provider: 'none'};
                setResult(r);
                resolve(r);
                return;
            }

            if (config.provider === 'geetest') {
                if (!sdkReady || typeof window === 'undefined' || !(window as any).initGeetest) {
                    console.warn('极验 SDK 未就绪');
                    resolve(null);
                    return;
                }

                (window as any).initGeetest({
                    captchaId: config.captcha_id,
                    product: 'bind',
                }, (captcha: any) => {
                    geetestRef.current = captcha;
                    captcha.showCaptcha();

                    captcha.onSuccess(() => {
                        const v = captcha.getValidate();
                        const r: CaptchaResult = {
                            provider: 'geetest',
                            lot_number: v.lot_number,
                            captcha_output: v.captcha_output,
                            pass_token: v.pass_token,
                            gen_time: v.gen_time,
                        };
                        setIsVerified(true);
                        setResult(r);
                        resolve(r);
                    });

                    captcha.onError(() => resolve(null));
                    captcha.onClose(() => resolve(null));
                });
            } else {
                // 其他平台由后端二次校验，前端直接放行
                setIsVerified(true);
                const r: CaptchaResult = {provider: config.provider};
                setResult(r);
                resolve(r);
            }
        });
    };

    // 4. 重置
    const reset = () => {
        setIsVerified(false);
        setResult(null);
        if (geetestRef.current) {
            try {
                geetestRef.current.reset();
            } catch { /* ignore */
            }
        }
    };

    return {isVerified, result, execute, reset};
}

/**
 * 人机验证按钮组件
 * 未启用时渲染为不可见（占位），启用后显示点击验证按钮
 */
export default function CaptchaButton({
                                          captcha,
                                          size = 'default',
                                      }: {
    captcha: CaptchaHandle;
    size?: 'sm' | 'default';
}) {
    const [verifying, setVerifying] = useState(false);

    const handleClick = async () => {
        if (captcha.isVerified) return;
        setVerifying(true);
        await captcha.execute();
        setVerifying(false);
    };

    // 配置未加载完成前不渲染
    // 只在启用了人机验证时显示
    // 通过检查 captcha.result 来判断 — none 表示未启用
    // 更好的方式：只有当 config active 且 provider != 'none' 才显示
    // 但我们无法直接访问 config，通过判断: 如果 isVerified 且 result?.provider === 'none' 就是不启用

    // 使用内联样式：如果 provider === 'none'（未启用）则不显示
    const hidden = captcha.isVerified && captcha.result?.provider === 'none';

    if (hidden) return null;

    const btnClass = size === 'sm'
        ? 'px-3 py-1.5 text-xs'
        : 'px-4 py-2 text-sm';

    if (captcha.isVerified) {
        return (
            <div className="flex items-center gap-1.5 text-green-600 text-sm">
                <ShieldCheck className="w-4 h-4"/>
                <span>已验证</span>
                <button
                    type="button"
                    onClick={captcha.reset}
                    className="text-gray-400 hover:text-gray-600 text-xs underline ml-1"
                >
                    重验
                </button>
            </div>
        );
    }

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={verifying}
            className={`flex items-center gap-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-blue-400 hover:text-blue-600 transition-colors disabled:opacity-50 ${btnClass}`}
        >
            {verifying ? (
                <Loader2 className="w-4 h-4 animate-spin"/>
            ) : (
                <ShieldAlert className="w-4 h-4"/>
            )}
            <span>{verifying ? '验证中...' : '点击验证'}</span>
        </button>
    );
}

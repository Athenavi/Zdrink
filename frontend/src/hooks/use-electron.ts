/**
 * Electron 相关 React Hooks
 */

import {useEffect, useState} from 'react';
import {getAppVersion, getPlatform, Platform} from '@/lib/platform';

/**
 * 获取当前平台信息
 */
export function usePlatform() {
    const [platform, setPlatform] = useState<Platform>('web');

    useEffect(() => {
        setPlatform(getPlatform());
    }, []);

    return platform;
}

/**
 * 检测是否在 Electron 环境中
 */
export function useIsElectron() {
    const platform = usePlatform();
    return platform === 'electron';
}

/**
 * 检测是否在移动设备中
 */
export function useIsMobile() {
    const platform = usePlatform();
    return platform === 'android' || platform === 'ios';
}

/**
 * 获取应用版本（仅 Electron）
 */
export function useAppVersion() {
    const [version, setVersion] = useState<string | null>(null);
    const isElectronEnv = useIsElectron();

    useEffect(() => {
        if (isElectronEnv) {
            getAppVersion().then(setVersion);
        }
    }, [isElectronEnv]);

    return version;
}

/**
 * 监听全屏状态变化
 */
export function useFullscreenState() {
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);

        // 初始检查
        setIsFullscreen(!!document.fullscreenElement);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);

    return isFullscreen;
}

/**
 * 监听网络状态
 */
export function useOnlineStatus() {
    const [isOnline, setIsOnline] = useState(true);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        setIsOnline(navigator.onLine);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return isOnline;
}

/**
 * 监听窗口焦点状态
 */
export function useDocumentVisible() {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const handleVisibilityChange = () => {
            setIsVisible(document.visibilityState === 'visible');
        };

        setIsVisible(document.visibilityState === 'visible');

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    return isVisible;
}

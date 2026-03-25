/**
 * 跨平台工具函数
 * 检测运行环境并提供相应的 API
 */

export type Platform = 'web' | 'electron' | 'android' | 'ios' | 'unknown';

interface ElectronAPI {
    getAppVersion: () => Promise<string>;
    minimizeWindow: () => void;
    maximizeWindow: () => void;
    closeWindow: () => void;
    platform: string;
    isElectron: boolean;
}

declare global {
    interface Window {
        electronAPI?: ElectronAPI;
    }
}

/**
 * 检测当前运行平台
 */
export function getPlatform(): Platform {
    // 检测 Electron
    if (typeof window !== 'undefined' && window.electronAPI?.isElectron) {
        return 'electron';
    }

    // 检测 Android
    if (/Android/i.test(navigator.userAgent)) {
        return 'android';
    }

    // 检测 iOS
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        return 'ios';
    }

    // 默认为 Web
    return 'web';
}

/**
 * 是否在 Electron 环境中
 */
export function isElectron(): boolean {
    return getPlatform() === 'electron';
}

/**
 * 是否在移动设备中
 */
export function isMobile(): boolean {
    const platform = getPlatform();
    return platform === 'android' || platform === 'ios';
}

/**
 * 是否在桌面环境中
 */
export function isDesktop(): boolean {
    return getPlatform() === 'electron' || getPlatform() === 'web';
}

/**
 * 获取应用版本（Electron 环境）
 */
export async function getAppVersion(): Promise<string | null> {
    if (isElectron() && window.electronAPI) {
        try {
            return await window.electronAPI.getAppVersion();
        } catch (error) {
            console.error('获取应用版本失败:', error);
        }
    }
    return null;
}

/**
 * 最小化窗口（Electron 环境）
 */
export function minimizeWindow(): void {
    if (isElectron() && window.electronAPI) {
        window.electronAPI.minimizeWindow();
    }
}

/**
 * 最大化/还原窗口（Electron 环境）
 */
export function maximizeWindow(): void {
    if (isElectron() && window.electronAPI) {
        window.electronAPI.maximizeWindow();
    }
}

/**
 * 关闭窗口（Electron 环境）
 */
export function closeWindow(): void {
    if (isElectron() && window.electronAPI) {
        window.electronAPI.closeWindow();
    }
}

/**
 * 退出应用（Electron 环境）
 */
export function quitApp(): void {
    if (isElectron() && window.electronAPI) {
        // Electron 没有直接的 quit API，需要主进程配合
        console.log('请通过主进程退出应用');
    }
}

/**
 * 获取用户代理字符串
 */
export function getUserAgent(): string {
    if (typeof navigator !== 'undefined') {
        return navigator.userAgent;
    }
    return '';
}

/**
 * 是否支持 PWA 功能
 */
export function supportsPWA(): boolean {
    return typeof window !== 'undefined' &&
        'serviceWorker' in navigator &&
        'PushManager' in window;
}

/**
 * 是否支持原生通知
 */
export function supportsNativeNotifications(): boolean {
    return 'Notification' in window;
}

/**
 * 请求全屏（移动端/桌面端）
 */
export async function requestFullscreen(): Promise<void> {
    const element = document.documentElement;

    try {
        if (element.requestFullscreen) {
            await element.requestFullscreen();
        } else if ((element as any).webkitRequestFullscreen) {
            await (element as any).webkitRequestFullscreen();
        } else if ((element as any).msRequestFullscreen) {
            await (element as any).msRequestFullscreen();
        }
    } catch (error) {
        console.error('全屏请求失败:', error);
    }
}

/**
 * 退出全屏
 */
export async function exitFullscreen(): Promise<void> {
    try {
        if (document.exitFullscreen) {
            await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
            await (document as any).webkitExitFullscreen();
        } else if ((document as any).msExitFullscreen) {
            await (document as any).msExitFullscreen();
        }
    } catch (error) {
        console.error('退出全屏失败:', error);
    }
}

/**
 * 是否处于全屏模式
 */
export function isFullscreen(): boolean {
    return !!(document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).msFullscreenElement);
}

/**
 * 获取屏幕方向
 */
export function getScreenOrientation(): string {
    if (typeof screen !== 'undefined' && (screen as any).orientation) {
        return (screen as any).orientation.type;
    }
    return 'unknown';
}

/**
 * 锁定屏幕方向（需要用户授权）
 */
export async function lockScreenOrientation(orientation: OrientationType): Promise<void> {
    try {
        if (typeof screen !== 'undefined' && (screen as any).orientation?.lock) {
            await (screen as any).orientation.lock(orientation);
        }
    } catch (error) {
        console.error('锁定屏幕方向失败:', error);
    }
}

/**
 * 解锁屏幕方向
 */
export function unlockScreenOrientation(): void {
    if (typeof screen !== 'undefined' && (screen as any).orientation?.unlock) {
        (screen as any).orientation.unlock();
    }
}

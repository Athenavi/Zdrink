/**
 * 全局类型声明
 */

// Electron API 类型
interface ElectronAPI {
    getAppVersion: () => Promise<string>;
    minimizeWindow: () => void;
    maximizeWindow: () => void;
    closeWindow: () => void;
    platform: string;
    isElectron: boolean;
    onAppVersionUpdate: (callback: (event: any, version: string) => void) => void;
}

declare global {
    interface Window {
        electronAPI?: ElectronAPI;
    }

    // CSS 样式扩展
    namespace React {
        interface CSSProperties {
            WebkitAppRegion?: 'drag' | 'no-drag';
        }
    }
}

// NextAuth 类型扩展
declare module 'next-auth' {
    interface Session {
        user: {
            name?: string | null;
            email?: string | null;
            image?: string | null;
            role?: string;
            id?: number;
            username?: string;
            phone?: string;
            accessToken?: string;
            refreshToken?: string;
        };
        accessToken?: string;
        refreshToken?: string;
    }

    interface User {
        id?: number;
        username?: string;
        phone?: string;
        role?: string;
        accessToken?: string;
        refreshToken?: string;
    }
}

// 导出空对象以作为模块
export {};

/**
 * 格式化价格
 * @param price - 价格数值 (支持 number 或 string 类型)
 * @returns 格式化后的价格字符串 (带¥符号)
 */
export const formatPrice = (price: number | string): string => {
    if (typeof price === 'string') {
        // 如果是字符串，转换为数字
        price = parseFloat(price);
    }

    // 确保是有效数字
    if (isNaN(price as number)) {
        price = 0;
    }

    // 保留两位小数并返回
    return `¥${(price as number).toFixed(2)}`;
};

/**
 * 格式化日期
 * @param date - 日期对象或日期字符串
 * @param format - 输出格式，默认 'YYYY-MM-DD HH:mm'
 * @returns 格式化后的日期字符串
 */
export const formatDate = (date: Date | string | number, format = 'YYYY-MM-DD HH:mm'): string => {
    if (!date) return '';

    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const minute = String(d.getMinutes()).padStart(2, '0');
    const second = String(d.getSeconds()).padStart(2, '0');

    return format
        .replace('YYYY', year.toString())
        .replace('MM', month)
        .replace('DD', day)
        .replace('HH', hour)
        .replace('mm', minute)
        .replace('ss', second);
};

/**
 * 格式化相对时间（如：刚刚、5 分钟前、1 小时前等）
 * @param date - 日期对象或日期字符串
 * @returns 相对时间描述
 */
export const formatRelativeTime = (date: Date | string | number): string => {
    const now = new Date();
    const target = new Date(date);
    const diffMs = now.getTime() - target.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) {
        return '刚刚';
    } else if (diffMinutes < 60) {
        return `${diffMinutes}分钟前`;
    } else if (diffHours < 24) {
        return `${diffHours}小时前`;
    } else if (diffDays < 7) {
        return `${diffDays}天前`;
    } else {
        return formatDate(target, 'YYYY-MM-DD');
    }
};

/**
 * 防抖函数
 * @param func - 需要防抖的函数
 * @param wait - 等待时间（毫秒）
 * @returns 防抖后的函数
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const debounce = <T extends (...args: any[]) => any>(func: T, wait: number): T => {
    let timeout: NodeJS.Timeout | null = null;

    return function executedFunction(this: unknown, ...args: Parameters<T>) {
        const later = () => {
            timeout = null;
            func.apply(this, args);
        };

        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(later, wait);
    } as T;
};

/**
 * 节流函数
 * @param func - 需要节流的函数
 * @param limit - 时间限制（毫秒）
 * @returns 节流后的函数
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const throttle = <T extends (...args: any[]) => any>(func: T, limit: number): T => {
    let inThrottle = false;

    return function throttledFunction(this: unknown, ...args: Parameters<T>) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => {
                inThrottle = false;
            }, limit);
        }
    } as T;
};

/**
 * 本地存储封装
 */
export const storage = {
    /**
     * 获取存储数据
     * @param key - 存储键名
     * @returns 存储的数据，失败返回 null
     */
    get(key: string): unknown {
        try {
            const item = localStorage.getItem(key);
            if (!item) return null;

            // 尝试解析 JSON
            try {
                return JSON.parse(item);
            } catch {
                // 不是 JSON 格式，直接返回原始值
                return item;
            }
        } catch (error) {
            console.error('Storage get error:', error);
            return null;
        }
    },

    /**
     * 设置存储数据
     * @param key - 存储键名
     * @param value - 存储的值
     */
    set(key: string, value: unknown): void {
        try {
            const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
            localStorage.setItem(key, serializedValue);
        } catch (error) {
            console.error('Storage set error:', error);
            // 如果 JSON 序列化失败，尝试存储原始值
            try {
                localStorage.setItem(key, String(value));
            } catch (e) {
                console.error('Storage set fallback error:', e);
            }
        }
    },

    /**
     * 移除存储数据
     * @param key - 存储键名
     */
    remove(key: string): void {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error('Storage remove error:', error);
        }
    },

    /**
     * 清空所有存储
     */
    clear(): void {
        try {
            localStorage.clear();
        } catch (error) {
            console.error('Storage clear error:', error);
        }
    },

    /**
     * 获取所有 keys
     * @returns 所有键名数组
     */
    keys(): string[] {
        try {
            return Object.keys(localStorage);
        } catch (error) {
            console.error('Storage keys error:', error);
            return [];
        }
    }
};

/**
 * 生成随机 ID
 * @returns 随机字符串 ID
 */
export const generateId = (): string => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
};

/**
 * 检查是否是移动设备
 * @returns 是否为移动设备
 */
export const isMobile = (): boolean => {
    if (typeof window === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * 检查是否是平板设备
 * @returns 是否为平板设备
 */
export const isTablet = (): boolean => {
    if (typeof window === 'undefined') return false;
    const userAgent = navigator.userAgent.toLowerCase();
    return /(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(userAgent);
};

/**
 * 检查是否是桌面设备
 * @returns 是否为桌面设备
 */
export const isDesktop = (): boolean => {
    return !isMobile() && !isTablet();
};

/**
 * 图片 URL 处理
 * @param url - 图片 URL
 * @param baseUrl - 基础 URL（可选）
 * @returns 完整的图片 URL
 */
export const getImageUrl = (url: string, baseUrl?: string): string => {
    if (!url) return '';

    // 已经是完整 URL
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }

    // 使用提供的 baseUrl
    if (baseUrl) {
        return `${baseUrl.replace(/\/$/, '')}${url.startsWith('/') ? url : '/' + url}`;
    }

    // 默认添加/api 前缀
    return `/api${url.startsWith('/') ? url : '/' + url}`;
};

/**
 * 数字格式化（千分位）
 * @param num - 数字
 * @returns 格式化后的字符串
 */
export const formatNumber = (num: number | string): string => {
    if (typeof num !== 'number') {
        num = parseFloat(num as string) || 0;
    }
    return (num as number).toLocaleString('zh-CN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
};

/**
 * 文件大小格式化
 * @param bytes - 字节数
 * @param decimals - 小数位数
 * @returns 格式化后的大小
 */
export const formatFileSize = (bytes: number, decimals = 2): string => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

/**
 * 百分比格式化
 * @param value - 数值（0-1 之间）
 * @param decimals - 小数位数
 * @returns 百分比字符串
 */
export const formatPercent = (value: number, decimals = 0): string => {
    const num = typeof value === 'number' ? value : parseFloat(value as string) || 0;
    return `${(num * 100).toFixed(decimals)}%`;
};

/**
 * 深拷贝（简单实现）
 * @param obj - 需要拷贝的对象
 * @returns 拷贝后的对象
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const deepClone = <T>(obj: T): T => {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => deepClone(item)) as T;
    }

    const cloned = {} as T;
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            cloned[key] = deepClone(obj[key]);
        }
    }

    return cloned;
};

/**
 * 睡眠函数（用于异步等待）
 * @param ms - 毫秒数
 * @returns Promise
 */
export const sleep = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * 重试函数
 * @param fn - 需要重试的异步函数
 * @param retries - 重试次数
 * @param delay - 每次重试间隔（毫秒）
 * @returns 函数执行结果
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const retry = async <T extends (...args: any[]) => Promise<any>>(
    fn: T,
    retries = 3,
    delay = 1000
): Promise<ReturnType<T>> => {
    try {
        return await fn();
    } catch (error) {
        if (retries <= 0) {
            throw error;
        }
        await sleep(delay);
        return retry(fn, retries - 1, delay);
    }
};

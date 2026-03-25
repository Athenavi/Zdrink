import {type ClassValue, clsx} from "clsx"
import {twMerge} from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

// 防抖函数
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;
    return function executedFunction(...args: Parameters<T>) {
        const later = () => {
            if (timeout) {
                clearTimeout(timeout);
            }
            func(...args);
        };
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(later, wait);
    };
}

// 节流函数
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return function executedFunction(...args: Parameters<T>) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// 格式化价格
export function formatPrice(price: number | string | undefined | null): string {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price || 0;
    return `¥${numPrice.toFixed(2)}`;
}

// 格式化日期
export function formatDate(date: Date | number | string | undefined | null, format?: string): string {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    if (format === 'YYYY-MM-DD HH:mm:ss') {
        return d.toISOString().replace('T', ' ').substring(0, 19);
    }
    return d.toISOString().split('T')[0];
}

// LocalStorage 工具
export const storage = {
    set(key: string, value: any): void {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error('LocalStorage set error:', error);
        }
    },
    get(key: string): any {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.error('LocalStorage get error:', error);
            return null;
        }
    },
    remove(key: string): void {
        localStorage.removeItem(key);
    },
    clear(): void {
        localStorage.clear();
    },
    keys(): string[] {
        return Object.keys(localStorage);
    }
};

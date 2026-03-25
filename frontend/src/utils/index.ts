/**
 * 获取完整的图片 URL
 * @param path 图片相对路径或完整 URL
 * @returns 完整的图片 URL
 */
export function getImageUrl(path?: string | null): string {
    if (!path) return '/placeholder.png';

    // 如果已经是完整 URL，直接返回
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }

    // 拼接 Django media URL
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
}

/**
 * 格式化价格
 * @param price 价格（分）
 * @returns 格式化后的价格字符串
 */
export function formatPrice(price?: number | null): string {
    if (price == null) return '¥0.00';
    return `¥${(price / 100).toFixed(2)}`;
}

/**
 * 格式化日期
 * @param dateStr ISO 日期字符串
 * @param format 格式
 * @returns 格式化后的日期字符串
 */
export function formatDate(dateStr: string, format: 'datetime' | 'date' | 'time' = 'datetime'): string {
    const date = new Date(dateStr);

    switch (format) {
        case 'datetime':
            return date.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        case 'date':
            return date.toLocaleDateString('zh-CN');
        case 'time':
            return date.toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'});
        default:
            return dateStr;
    }
}

/**
 * 防抖函数
 * @param fn 要执行的函数
 * @param delay 延迟时间（毫秒）
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: any[]) => any>(
    fn: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timer: NodeJS.Timeout | null = null;

    return function (...args: Parameters<T>) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            fn(...args);
        }, delay);
    };
}

/**
 * 休眠函数
 * @param ms 毫秒数
 * @returns Promise
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

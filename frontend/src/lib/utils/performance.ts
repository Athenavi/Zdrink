/**
 * 性能优化工具函数
 */

import {debounce, throttle} from '@/lib/utils';

/**
 * 图片懒加载配置
 */
export interface LazyLoadConfig {
    root?: Element | null;
    rootMargin?: string;
    threshold?: number | number[];
}

/**
 * 创建 Intersection Observer 实例
 * 用于监听元素是否进入视口
 */
export const createIntersectionObserver = (
    callback: IntersectionObserverCallback,
    options: LazyLoadConfig = {}
): IntersectionObserver => {
    return new IntersectionObserver(callback, {
        root: options.root || null,
        rootMargin: options.rootMargin || '0px',
        threshold: options.threshold || 0
    });
};

/**
 * 观察多个元素的可见性
 * @param elements - 需要观察的元素数组
 * @param callback - 回调函数
 * @param options - 配置选项
 * @returns 取消观察的函数
 */
export const observeElements = (
    elements: Element[],
    callback: IntersectionObserverCallback,
    options: LazyLoadConfig = {}
): (() => void) => {
    const observer = createIntersectionObserver(callback, options);

    elements.forEach(element => {
        observer.observe(element);
    });

    // 返回取消观察的函数
    return () => {
        observer.disconnect();
    };
};

/**
 * 请求空闲回调封装
 * 在浏览器空闲时执行低优先级任务
 */
export const requestIdleCallback = (
    callback: IdleRequestCallback,
    timeout = 1000
): number => {
    if ('requestIdleCallback' in window) {
        return window.requestIdleCallback(callback, {timeout});
    }

    // 降级处理
    return setTimeout(() => {
        callback({
            didTimeout: false,
            timeRemaining: () => Infinity,
        });
    }, 1) as unknown as number;
};

/**
 * 取消请求空闲回调
 */
export const cancelIdleCallback = (handle: number): void => {
    if ('cancelIdleCallback' in window) {
        window.cancelIdleCallback(handle);
    } else {
        clearTimeout(handle);
    }
};

/**
 * 防抖搜索函数
 * 专门用于搜索框输入优化
 */
export const createDebouncedSearch = <T>(
    searchFn: (query: string) => Promise<T>,
    debounceMs = 300
) => {
    const debouncedFn = debounce(searchFn, debounceMs);
    return debouncedFn;
};

/**
 * 节流滚动事件处理
 * 用于滚动加载更多等场景
 */
export const createThrottledScrollHandler = (
    handler: () => void,
    limitMs = 200
) => {
    return throttle(handler, limitMs);
};

/**
 * 批量更新优化
 * 使用 React 18 的 batchedUpdates 或自动批处理
 */
export const batchedUpdates = (callback: () => void): void => {
    // React 18 自动批处理所有更新
    callback();
};

/**
 * 内存泄漏防护
 * 清理定时器和观察者
 */
export class CleanupManager {
    private timers: Set<number> = new Set();
    private observers: Set<IntersectionObserver> = new Set();
    private abortControllers: Set<AbortController> = new Set();

    /**
     * 添加定时器
     */
    addTimer(timerId: number): void {
        this.timers.add(timerId);
    }

    /**
     * 添加观察者
     */
    addObserver(observer: IntersectionObserver): void {
        this.observers.add(observer);
    }

    /**
     * 添加 AbortController
     */
    addAbortController(controller: AbortController): void {
        this.abortControllers.add(controller);
    }

    /**
     * 清理所有资源
     */
    cleanup(): void {
        // 清除所有定时器
        this.timers.forEach(timerId => clearTimeout(timerId));
        this.timers.clear();

        // 断开所有观察者
        this.observers.forEach(observer => observer.disconnect());
        this.observers.clear();

        // 中止所有请求
        this.abortControllers.forEach(controller => controller.abort());
        this.abortControllers.clear();
    }
}

/**
 * 性能监控工具
 */
export const performanceMonitor = {
    /**
     * 开始计时
     */
    start(label: string): void {
        if (typeof performance !== 'undefined') {
            performance.mark(`${label}-start`);
        }
    },

    /**
     * 结束计时并输出结果
     */
    end(label: string): number {
        if (typeof performance !== 'undefined') {
            performance.mark(`${label}-end`);
            performance.measure(label, `${label}-start`, `${label}-end`);

            const measure = performance.getEntriesByName(label)[0];
            const duration = measure.duration;

            // 清理标记
            performance.clearMarks(`${label}-start`);
            performance.clearMarks(`${label}-end`);
            performance.clearMeasures(label);

            return duration;
        }
        return 0;
    },

    /**
     * 测量函数执行时间
     */
    measure<T>(label: string, fn: () => T): T {
        this.start(label);
        const result = fn();
        const duration = this.end(label);

        console.log(`[${label}] 执行时间：${duration.toFixed(2)}ms`);
        return result;
    }
};

/**
 * 大列表分片渲染
 * 将大数组分成小块逐步渲染，避免阻塞主线程
 */
export const chunkedRender = <T>(
    items: T[],
    chunkSize = 100,
    delayMs = 0
): T[][] => {
    const chunks: T[][] = [];

    for (let i = 0; i < items.length; i += chunkSize) {
        chunks.push(items.slice(i, i + chunkSize));
    }

    return chunks;
};

/**
 * 缓存计算结果
 * 使用 Map 实现简单的记忆化
 */
export const memoize = <T extends (...args: any[]) => any>(
    fn: T,
    cacheKeyFn?: (...args: Parameters<T>) => string
): ((...args: Parameters<T>) => ReturnType<T>) => {
    const cache = new Map<string, ReturnType<T>>();

    return (...args: Parameters<T>): ReturnType<T> => {
        const key = cacheKeyFn
            ? cacheKeyFn(...args)
            : JSON.stringify(args);

        if (cache.has(key)) {
            return cache.get(key)!;
        }

        const result = fn(...args);
        cache.set(key, result);
        return result;
    };
};

/**
 * 优化图片加载
 * 预加载关键图片
 */
export const preloadImage = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = src;
    });
};

/**
 * 预加载多张图片
 */
export const preloadImages = async (sources: string[]): Promise<void> => {
    await Promise.all(sources.map(preloadImage));
};

/**
 * Web Worker 池管理
 * 用于 CPU 密集型任务
 */
export class WorkerPool {
    private workers: Worker[] = [];
    private queue: Array<{ data: any; resolve: (result: any) => void }> = [];
    private availableWorkers: Worker[] = [];

    constructor(workerScript: string, poolSize = 4) {
        for (let i = 0; i < poolSize; i++) {
            const worker = new Worker(workerScript);
            worker.onmessage = (event) => {
                const task = this.queue.shift();
                if (task) {
                    task.resolve(event.data);
                } else {
                    this.availableWorkers.push(worker);
                }
            };
            this.workers.push(worker);
            this.availableWorkers.push(worker);
        }
    }

    postMessage(data: any): Promise<any> {
        return new Promise((resolve) => {
            if (this.availableWorkers.length > 0) {
                const worker = this.availableWorkers.pop()!;
                worker.postMessage(data);
                this.queue.push({data, resolve});
            } else {
                this.queue.push({data, resolve});
            }
        });
    }

    terminate(): void {
        this.workers.forEach(worker => worker.terminate());
        this.workers = [];
        this.availableWorkers = [];
        this.queue = [];
    }
}

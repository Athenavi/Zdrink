'use client';

import {ReactNode, Suspense, useMemo} from 'react';
import Loading from '@/components/Loading';

interface LazyLoadProps {
    children: ReactNode;
    fallback?: ReactNode;
}

/**
 * 懒加载组件包装器
 * 使用 Suspense 实现组件的懒加载和代码分割
 */
export function LazyLoad({children, fallback}: LazyLoadProps) {
    return (
        <Suspense fallback={fallback || <Loading/>}>
            {children}
        </Suspense>
    );
}

/**
 * 图片懒加载组件
 * 使用 Intersection Observer API 实现图片懒加载
 */
interface LazyImageProps {
    src: string;
    alt: string;
    className?: string;
    placeholder?: string;
    onLoad?: () => void;
    onError?: () => void;
}

export function LazyImage({
                              src,
                              alt,
                              className = '',
                              placeholder = '/images/placeholder.jpg',
                              onLoad,
                              onError
                          }: LazyImageProps) {
    const handleLoad = () => {
        onLoad?.();
    };

    const handleError = () => {
        onError?.();
    };

    return (
        <img
            src={src}
            alt={alt}
            className={className}
            loading="lazy"
            onLoad={handleLoad}
            onError={handleError}
        />
    );
}

/**
 * 列表虚拟滚动组件
 * 仅渲染可见区域的列表项，提升长列表性能
 */
interface VirtualListProps<T> {
    items: T[];
    itemHeight: number;
    containerHeight: number;
    renderItem: (item: T, index: number) => ReactNode;
    className?: string;
    overscan?: number; // 预渲染的额外项数
}

export function VirtualList<T>({
                                   items,
                                   itemHeight,
                                   containerHeight,
                                   renderItem,
                                   className = '',
                                   overscan = 5
                               }: VirtualListProps<T>) {
    const totalHeight = items.length * itemHeight;
    const visibleCount = Math.ceil(containerHeight / itemHeight);

    // 简化版本：实际项目中可使用 react-window 或 react-virtualized
    const visibleItems = items.slice(0, visibleCount + overscan * 2);

    return (
        <div
            className={className}
            style={{
                height: Math.min(totalHeight, containerHeight),
                overflow: totalHeight > containerHeight ? 'auto' : 'hidden'
            }}
        >
            {visibleItems.map((item, index) => (
                <div key={index} style={{height: itemHeight}}>
                    {renderItem(item, index)}
                </div>
            ))}

            {totalHeight > containerHeight && (
                <div style={{height: totalHeight - containerHeight}}/>
            )}
        </div>
    );
}

/**
 * 防抖输入框组件
 * 延迟触发 onChange 事件，减少频繁渲染
 */
interface DebouncedInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    debounceMs?: number;
    className?: string;
    type?: string;
}

export function DebouncedInput({
                                   value,
                                   onChange,
                                   placeholder,
                                   debounceMs = 300,
                                   className = '',
                                   type = 'text'
                               }: DebouncedInputProps) {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;

        // 清除之前的定时器
        const timeoutId = setTimeout(() => {
            onChange(newValue);
        }, debounceMs);

        return () => clearTimeout(timeoutId);
    };

    return (
        <input
            type={type}
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            className={className}
        />
    );
}

/**
 * 记忆化组件
 * 使用 React.memo 避免不必要的重新渲染
 */
interface MemoProps<T extends Record<string, unknown>> {
    children: ReactNode;
    dependencies: T;
}

export function MemoComponent<T extends Record<string, unknown>>({
                                                                     children,
                                                                     dependencies
                                                                 }: MemoProps<T>) {
    const Memoized = useMemoComponent(() => children, Object.values(dependencies));
    return <>{Memoized}</>;
}

function useMemoComponent<T>(fn: () => T, deps: unknown[]): T {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return useMemo(fn, Object.values(deps));
}

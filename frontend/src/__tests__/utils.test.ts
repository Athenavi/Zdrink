/**
 * 工具函数测试示例
 */

import {debounce, formatDate, formatPrice, storage, throttle} from '@/lib/utils';

describe('Utility Functions', () => {
    describe('formatPrice', () => {
        it('应该正确格式化数字价格', () => {
            expect(formatPrice(10)).toBe('¥10.00');
            expect(formatPrice(10.5)).toBe('¥10.50');
            expect(formatPrice(10.999)).toBe('¥11.00');
        });

        it('应该正确格式化字符串价格', () => {
            expect(formatPrice('10')).toBe('¥10.00');
            expect(formatPrice('10.5')).toBe('¥10.50');
        });

        it('应该处理无效输入', () => {
            expect(formatPrice(null)).toBe('¥0.00');
            expect(formatPrice(undefined)).toBe('¥0.00');
            expect(formatPrice('')).toBe('¥0.00');
            expect(formatPrice('abc')).toBe('¥0.00');
        });
    });

    describe('formatDate', () => {
        it('应该正确格式化日期', () => {
            const date = new Date('2024-01-01T10:30:00');
            expect(formatDate(date)).toBe('2024-01-01');
            expect(formatDate(date, 'YYYY-MM-DD HH:mm:ss')).toBe('2024-01-01 10:30:00');
        });

        it('应该处理时间戳', () => {
            const timestamp = 1704106200000; // 2024-01-01T10:30:00
            expect(formatDate(timestamp)).toBe('2024-01-01');
        });

        it('应该处理无效日期', () => {
            expect(formatDate(null)).toBe('');
            expect(formatDate(undefined)).toBe('');
            expect(formatDate('invalid')).toBe('');
        });
    });

    describe('debounce', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('应该延迟执行函数', () => {
            const mockFn = jest.fn();
            const debouncedFn = debounce(mockFn, 100);

            debouncedFn();
            expect(mockFn).not.toHaveBeenCalled();

            jest.advanceTimersByTime(100);
            expect(mockFn).toHaveBeenCalledTimes(1);
        });

        it('应该取消之前的调用', () => {
            const mockFn = jest.fn();
            const debouncedFn = debounce(mockFn, 100);

            debouncedFn();
            debouncedFn();
            debouncedFn();

            jest.advanceTimersByTime(100);
            expect(mockFn).toHaveBeenCalledTimes(1);
        });

        it('应该传递参数给函数', () => {
            const mockFn = jest.fn();
            const debouncedFn = debounce(mockFn, 100);

            debouncedFn('test', 123);
            jest.advanceTimersByTime(100);

            expect(mockFn).toHaveBeenCalledWith('test', 123);
        });
    });

    describe('throttle', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('应该限制函数执行频率', () => {
            const mockFn = jest.fn();
            const throttledFn = throttle(mockFn, 100);

            throttledFn();
            throttledFn();
            throttledFn();

            jest.advanceTimersByTime(100);
            expect(mockFn).toHaveBeenCalledTimes(1);

            throttledFn();
            jest.advanceTimersByTime(100);
            expect(mockFn).toHaveBeenCalledTimes(2);
        });

        it('应该立即执行第一次调用', () => {
            const mockFn = jest.fn();
            const throttledFn = throttle(mockFn, 100);

            throttledFn();
            expect(mockFn).toHaveBeenCalledTimes(1);
        });
    });

    describe('storage', () => {
        beforeEach(() => {
            localStorage.clear();
        });

        it('应该存储和读取字符串', () => {
            storage.set('test-key', 'test-value');
            expect(storage.get('test-key')).toBe('test-value');
        });

        it('应该存储和读取对象', () => {
            const obj = {name: 'test', value: 123};
            storage.set('obj-key', obj);
            expect(storage.get('obj-key')).toEqual(obj);
        });

        it('应该删除指定的键', () => {
            storage.set('test-key', 'test-value');
            storage.remove('test-key');
            expect(storage.get('test-key')).toBeNull();
        });

        it('应该清除所有存储', () => {
            storage.set('key1', 'value1');
            storage.set('key2', 'value2');
            storage.clear();
            expect(storage.keys()).toEqual([]);
        });

        it('应该返回所有键名', () => {
            storage.set('key1', 'value1');
            storage.set('key2', 'value2');
            expect(storage.keys()).toContain('key1');
            expect(storage.keys()).toContain('key2');
        });

        it('应该处理 JSON 解析错误', () => {
            localStorage.setItem('invalid-json', '{invalid json}');
            expect(() => storage.get('invalid-json')).not.toThrow();
        });
    });
});

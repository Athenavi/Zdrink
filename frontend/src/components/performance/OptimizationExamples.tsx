/**
 * React 组件性能优化最佳实践示例
 */

/**
 * 6. 使用 Suspense 实现加载状态
 */
import {lazy, memo, Suspense, useCallback, useEffect, useMemo, useRef, useState} from 'react';
// 引入防抖函数
import {debounce} from '@/lib/utils';

/**
 * 1. 使用 React.memo 避免不必要的渲染
 */
interface ProductCardProps {
    id: number;
    name: string;
    price: number;
    onAddToCart: (id: number) => void;
}

// 优化前：每次父组件更新都会重新渲染
const ProductCardBefore = ({id, name, price, onAddToCart}: ProductCardProps) => {
    console.log('ProductCard rendered');
    return (
        <div>
            <h3>{name}</h3>
            <p>${price}</p>
            <button onClick={() => onAddToCart(id)}>加入购物车</button>
        </div>
    );
};

// 优化后：只有 props 变化时才重新渲染
const ProductCard = memo(({id, name, price, onAddToCart}: ProductCardProps) => {
    console.log('ProductCard rendered');
    return (
        <div>
            <h3>{name}</h3>
            <p>${price}</p>
            <button onClick={() => onAddToCart(id)}>加入购物车</button>
        </div>
    );
}, (prevProps, nextProps) => {
    // 自定义比较函数
    return (
        prevProps.id === nextProps.id &&
        prevProps.name === nextProps.name &&
        prevProps.price === nextProps.price
    );
});

/**
 * 2. 使用 useMemo 缓存计算结果
 */
interface Order {
    id: number;
    items: Array<{ price: number; quantity: number }>;
    taxRate: number;
}

function calculateTotal(order: Order): number {
    console.log('Calculating total...');
    const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = subtotal * order.taxRate;
    return subtotal + tax;
}

const OrderSummary = ({order}: { order: Order }) => {
    // 优化前：每次渲染都重新计算
    // const total = calculateTotal(order);

    // 优化后：只有 order 变化时才重新计算
    const total = useMemo(() => calculateTotal(order), [order]);

    return <div>总计：${total.toFixed(2)}</div>;
};

/**
 * 3. 使用 useCallback 缓存函数引用
 */
const ShoppingCart = () => {
    const [items, setItems] = useState<number[]>([]);

    // 优化前：每次渲染都创建新函数，导致子组件重复渲染
    // const addItem = (id: number) => {
    //   setItems(prev => [...prev, id]);
    // };

    // 优化后：函数引用被缓存
    const addItem = useCallback((id: number) => {
        setItems(prev => [...prev, id]);
    }, []);

    return (
        <div>
            {items.map(id => (
                <ProductCard key={id} id={id} name={`Product ${id}`} price={10} onAddToCart={addItem}/>
            ))}
        </div>
    );
};

/**
 * 4. 使用虚拟滚动优化长列表
 */
interface VirtualListProps<T> {
    items: T[];
    itemHeight: number;
    containerHeight: number;
    renderItem: (item: T, index: number) => React.ReactNode;
}

export function VirtualList<T>({
                                   items,
                                   itemHeight,
                                   containerHeight,
                                   renderItem
                               }: VirtualListProps<T>) {
    const [scrollTop, setScrollTop] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(startIndex + visibleCount + 1, items.length);

    const visibleItems = items.slice(startIndex, endIndex);
    const offsetY = startIndex * itemHeight;

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
    };

    return (
        <div
            ref={containerRef}
            style={{height: containerHeight, overflow: 'auto'}}
            onScroll={handleScroll}
        >
            <div style={{height: items.length * itemHeight, position: 'relative'}}>
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    transform: `translateY(${offsetY}px)`
                }}>
                    {visibleItems.map((item, index) => (
                        <div key={startIndex + index} style={{height: itemHeight}}>
                            {renderItem(item, startIndex + index)}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/**
 * 5. 使用懒加载优化大组件
 */
const HeavyComponent = () => {
    const [data, setData] = useState<string[]>([]);

    useEffect(() => {
        // 模拟大量数据
        const heavyData = Array.from({length: 1000}, (_, i) => `Item ${i}`);
        setData(heavyData);
    }, []);

    return (
        <div>
            <h3>重型组件</h3>
            <ul>
                {data.slice(0, 100).map(item => (
                    <li key={item}>{item}</li>
                ))}
            </ul>
        </div>
    );
};

// 懒加载包装（暂时禁用，因为 HeavyComponent 不存在）
// const LazyHeavyComponent = lazy(() => import('./HeavyComponent'));

const DataDashboard = () => {
    return (
        <div>Data Dashboard Placeholder</div>
        // <Suspense fallback={<div>加载中...</div>}>
        //   <LazyHeavyComponent />
        // </Suspense>
    );
};

/**
 * 7. 防抖搜索输入
 */
const SearchBox = ({onSearch}: { onSearch: (query: string) => void }) => {
    const [query, setQuery] = useState('');

    const debouncedSearch = useMemo(
        () => debounce((value: string) => {
            onSearch(value);
        }, 300),
        [onSearch]
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setQuery(value);
        debouncedSearch(value);
    };

    return (
        <input
            type="text"
            value={query}
            onChange={handleChange}
            placeholder="搜索..."
        />
    );
};

/**
 * 8. 使用 Web Worker 处理 CPU 密集型任务
 */
const DataProcessor = () => {
    const [result, setResult] = useState<number | null>(null);
    const workerRef = useRef<Worker | null>(null);

    useEffect(() => {
        // 创建 Worker
        workerRef.current = new Worker('/workers/data-processor.js');

        workerRef.current.onmessage = (event) => {
            setResult(event.data);
        };

        return () => {
            workerRef.current?.terminate();
        };
    }, []);

    const processData = (data: number[]) => {
        workerRef.current?.postMessage(data);
    };

    return (
        <div>
            <button onClick={() => processData(Array.from({length: 10000}))}>
                处理大数据
            </button>
            {result && <div>处理完成：{result}</div>}
        </div>
    );
};

/**
 * 9. 使用 shouldComponentUpdate 的函数式版本
 */
interface ExpensiveComponentProps {
    data: { id: number; value: string };
    onUpdate: (id: number, value: string) => void;
}

const ExpensiveComponent = memo(({data, onUpdate}: ExpensiveComponentProps) => {
    console.log('ExpensiveComponent rendered');

    // 模拟昂贵的计算
    const processed = useMemo(() => {
        console.log('Processing data...');
        return (data.value || '').toUpperCase().split('').join('-');
    }, [data.value]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        onUpdate(data.id, e.target.value);
    }, [data.id, onUpdate]);

    return (
        <div>
            <input value={processed} onChange={handleChange}/>
        </div>
    );
}, (prevProps, nextProps) => {
    // 深度比较
    return (
        prevProps.data.id === nextProps.data.id &&
        prevProps.data.value === nextProps.data.value
    );
});

/**
 * 10. 批量更新状态
 */
const BatchUpdater = () => {
    const [count1, setCount1] = useState(0);
    const [count2, setCount2] = useState(0);
    const [count3, setCount3] = useState(0);

    // React 18 自动批处理，无需手动使用 unstable_batchedUpdates
    const handleIncrement = () => {
        // 这三个更新会被批处理为一次渲染
        setCount1(c => c + 1);
        setCount2(c => c + 1);
        setCount3(c => c + 1);
    };

    return (
        <div>
            <button onClick={handleIncrement}>全部 +1</button>
            <div>{count1} - {count2} - {count3}</div>
        </div>
    );
};

// 导出一系列优化后的组件
export {
    ProductCard,
    OrderSummary,
    ShoppingCart,
    SearchBox,
    DataProcessor,
    ExpensiveComponent,
    BatchUpdater,
    DataDashboard
};


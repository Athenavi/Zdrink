interface LoadingProps {
    loading?: boolean;
    text?: string;
    size?: 'sm' | 'md' | 'lg';
}

export default function Loading({loading = true, text = '加载中...', size = 'md'}: LoadingProps) {
    if (!loading) return null;

    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12'
    };

    return (
        <div className="flex flex-col items-center justify-center p-8">
            <div
                className={`${sizeClasses[size]} border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin`}
            />
            {text && (
                <p className="mt-4 text-sm text-gray-500">{text}</p>
            )}
        </div>
    );
}

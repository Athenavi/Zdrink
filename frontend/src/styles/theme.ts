/**
 * 主题配置
 * 基于原始 SCSS 变量迁移的 Tailwind CSS 主题配置
 */

export const theme = {
    // 主题颜色
    colors: {
        primary: {
            DEFAULT: '#1989fa',
            light: '#3a9aff',
            dark: '#0d6efd',
            50: '#e8f4ff',
            100: '#c8e2ff',
            200: '#9bcfff',
            300: '#5fb2ff',
            400: '#2b8dff',
            500: '#1989fa',
            600: '#0066e6',
            700: '#0052cc',
            800: '#0040aa',
            900: '#002a66',
        },
        success: {
            DEFAULT: '#07c160',
            light: '#2ecc71',
            dark: '#059669',
            50: '#e8f8f0',
            100: '#c8f0dc',
            200: '#9be5c3',
            300: '#5fd6a3',
            400: '#2bc485',
            500: '#07c160',
            600: '#00a850',
            700: '#008f40',
            800: '#007630',
            900: '#005220',
        },
        warning: {
            DEFAULT: '#ff976a',
            light: '#ffa940',
            dark: '#ff7f3f',
            50: '#fff0e8',
            100: '#ffdcc8',
            200: '#ffc89f',
            300: '#ffb06b',
            400: '#ffa34f',
            500: '#ff976a',
            600: '#ff7f3f',
            700: '#ff6a14',
            800: '#ff5200',
            900: '#e63a00',
        },
        danger: {
            DEFAULT: '#ee0a24',
            light: '#ff4d4f',
            dark: '#dc2626',
            50: '#fee8e8',
            100: '#fcc8c9',
            200: '#f99fa1',
            300: '#f56b6f',
            400: '#f14248',
            500: '#ee0a24',
            600: '#dc2626',
            700: '#b91c1c',
            800: '#991b1b',
            900: '#7f1d1d',
        },
        text: {
            DEFAULT: '#323233',
            light: '#969799',
            disabled: '#c8c9cc',
        },
        border: '#ebedf0',
        background: '#f7f8fa',
    },

    // 字体大小
    fontSize: {
        xs: ['10px', {lineHeight: '1.5'}],
        sm: ['12px', {lineHeight: '1.5'}],
        md: ['14px', {lineHeight: '1.5'}],
        lg: ['16px', {lineHeight: '1.5'}],
        xl: ['18px', {lineHeight: '1.5'}],
        '2xl': ['20px', {lineHeight: '1.5'}],
        '3xl': ['24px', {lineHeight: '1.5'}],
    },

    // 间距
    spacing: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        '2xl': '32px',
        '3xl': '48px',
        '4xl': '64px',
    },

    // 圆角
    borderRadius: {
        none: '0',
        sm: '4px',
        DEFAULT: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '24px',
        full: '9999px',
    },

    // 阴影
    boxShadow: {
        sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
        DEFAULT: '0 1px 3px rgba(0, 0, 0, 0.1)',
        md: '0 4px 6px rgba(0, 0, 0, 0.1)',
        lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
        xl: '0 20px 25px rgba(0, 0, 0, 0.15)',
    },

    // 页面最大宽度
    maxWidth: {
        page: '750px',
    },

    // 动画
    animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
    },

    keyframes: {
        fadeIn: {
            '0%': {opacity: '0'},
            '100%': {opacity: '1'},
        },
        slideUp: {
            '0%': {transform: 'translateY(20px)', opacity: '0'},
            '100%': {transform: 'translateY(0)', opacity: '1'},
        },
        slideDown: {
            '0%': {transform: 'translateY(-20px)', opacity: '0'},
            '100%': {transform: 'translateY(0)', opacity: '1'},
        },
        scaleIn: {
            '0%': {transform: 'scale(0.95)', opacity: '0'},
            '100%': {transform: 'scale(1)', opacity: '1'},
        },
    },
} as const;

// 导出工具函数
export const getThemeColor = (color: keyof typeof theme.colors, shade: number = 500): string => {
    const colorObj = theme.colors[color as keyof typeof theme.colors];
    if (typeof colorObj === 'object' && colorObj !== null) {
        return (colorObj as any)[shade] || (colorObj as any).DEFAULT || '#000';
    }
    return colorObj as string || '#000';
};

export default theme;

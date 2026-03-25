import '@testing-library/jest-dom';

// Mock next/router
jest.mock('next/router', () => ({
    useRouter() {
        return {
            route: '/',
            pathname: '/',
            query: {},
            asPath: '/',
            push: jest.fn(),
            replace: jest.fn(),
            prefetch: jest.fn(),
            back: jest.fn(),
            beforePopState: jest.fn(),
            events: {
                on: jest.fn(),
                off: jest.fn(),
                emit: jest.fn(),
            },
            isFallback: false,
            isLocaleDomain: false,
            isReady: true,
        };
    },
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
    useRouter() {
        return {
            push: jest.fn(),
            replace: jest.fn(),
            prefetch: jest.fn(),
            back: jest.fn(),
            forward: jest.fn(),
            refresh: jest.fn(),
        };
    },
    usePathname() {
        return '/';
    },
    useSearchParams() {
        return new URLSearchParams();
    },
    useParams() {
        return {};
    },
}));

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
    useSession() {
        return {
            data: null,
            status: 'loading',
        };
    },
    getSession: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
}));

// Mock next-auth/jwt
jest.mock('next-auth/jwt', () => ({
    getToken: jest.fn(),
}));

// 全局测试工具
global.fetch = jest.fn();
global.window.matchMedia = jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
}));

// 清理 mocks
afterEach(() => {
    jest.clearAllMocks();
});

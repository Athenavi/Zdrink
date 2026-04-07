// 用户相关类型
export interface User {
    id: number;
    username: string;
    email: string;
    phone?: string;
    avatar?: string;
    role?: string;
    organization?: number;
}

// 会话用户类型（NextAuth）
export interface SessionUser {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
}

export interface AuthTokens {
    access: string;
    refresh: string;
}

// 店铺相关类型
export interface Shop {
    id: number;
    name: string;
    description?: string;
    logo?: string;
    banner?: string;
    shop_type: 'restaurant' | 'cafe' | 'bar' | 'bakery' | 'other';
    is_active: boolean;
    address?: string;
    phone?: string;
    delivery_fee?: number;
    delivery_radius?: number;
    minimum_order_amount?: number;
    rating?: number;
    allow_delivery?: boolean;
    allow_pickup?: boolean;
    allow_dine_in?: boolean;
}

// 商品相关类型
export interface Product {
    id: number;
    name: string;
    description?: string;
    price: number | string;  // 支持 number 和 string (后端返回 Decimal 字符串)
    original_price?: number | string;
    base_price?: number | string;
    cost_price?: number | string;
    image?: string;
    main_image?: string;
    images?: string[];
    category?: number;
    shop?: number;
    stock?: number;
    is_available: boolean;
    sales_count?: number;
    rating?: number;
    preparation_time?: number;
    allow_customization?: boolean;
    skus?: SKU[];
    attributes?: ProductAttribute[];
}

export interface SKU {
    id: number;
    name?: string;
    sku_name?: string;
    price: number | string;  // 支持 number 和 string (后端返回 Decimal 字符串)
    stock?: number;
    stock_quantity?: number;
    specifications?: Record<string, any>;
    is_active?: boolean;
    is_in_stock?: boolean;
    is_low_stock?: boolean;
}

export interface ProductAttribute {
    id: number;
    name: string;
    is_required?: boolean;
    options?: ProductAttributeOption[];
}

export interface ProductAttributeOption {
    id: number;
    name: string;
    value?: string;
    additional_price?: number;
}

export interface Category {
    id: number;
    name: string;
    description?: string;
    parent?: number;
    shop?: number;
    image?: string;
    icon?: string;
    order?: number;
    product_count?: number;
}

// 购物车相关类型
export interface Cart {
    id: number;
    user: number;
    items: CartItem[];
    total_quantity: number | string;  // 支持 number 和 string
    total_price: number | string;  // 支持 number 和 string
}

export interface CartItem {
    id: number;
    product: {
        id: number;
        name: string;
        main_image?: string;
    };
    sku?: {
        id: number;
        specifications?: Record<string, any>;
    };
    quantity: number;
    unit_price: number | string;  // 支持 number 和 string
    total_price: number | string;  // 支持 number 和 string
}

// 订单相关类型
export interface Order {
    id: number;
    order_no: string;
    order_number: string;
    user: number;
    shop: number;
    shop_name?: string;
    status: 'pending' | 'paid' | 'preparing' | 'ready' | 'delivered' | 'completed' | 'cancelled' | 'confirmed';
    payment_status: 'unpaid' | 'paid' | 'refunded';
    total_amount: number | string;  // 支持 number 和 string
    discount_amount?: number | string;
    payment_amount: number | string;  // 支持 number 和 string
    paid_amount?: number | string;
    delivery_fee?: number | string;
    items: OrderItem[];
    delivery_info?: any;
    delivery_type?: 'delivery' | 'pickup' | 'dine_in';
    delivery_address?: {
        province: string;
        city: string;
        district: string;
        detail: string;
    };
    customer_phone?: string;
    customer_name?: string;
    remarks?: string;
    notes?: string;
    completed_at?: string;
    created_at: string;
    paid_at?: string;
}

export interface OrderItem {
    id: number;
    product: number;
    product_name: string;
    product_image?: string;
    quantity: number;
    unit_price: number | string;  // 支持 number 和 string
    total_price: number | string;  // 支持 number 和 string
    price?: number | string;
    specifications?: Record<string, any>;
    sku_specifications?: Record<string, any>;
    sku_name?: string;
}

// API 响应类型
export interface ApiResponse<T = any> {
    data?: T;
    results?: T[];
    count?: number;
    next?: string | null;
    previous?: string | null;
}

export interface ApiError {
    detail?: string;
    message?: string;

    [key: string]: any;
}

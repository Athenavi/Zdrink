import apiClient from '@/lib/api';

// POS 收银台 API
export const posApi = {
    // 快速下单
    quickOrder(data: {
        table_id?: number;
        items: Array<{ product_id: number; quantity: number }>;
        payment_method?: string;
    }) {
        return apiClient.post('/pos/pos/quick_order/', data);
    },

    // 扫描条码
    scanBarcode(data: { barcode: string }) {
        return apiClient.post('/pos/pos/scan_barcode/', data);
    },

    // 拆分订单
    splitOrder(data: { order_id: number; items: any[] }) {
        return apiClient.post('/pos/pos/split_order/', data);
    },

    // 合并订单
    mergeOrders(data: { order_ids: number[] }) {
        return apiClient.post('/pos/pos/merge_orders/', data);
    },

    // 获取桌台状态列表
    getTablesStatus(params?: { status?: string }) {
        return apiClient.get('/pos/tables/status/', {params});
    },

    // 更新桌台状态
    updateTableStatus(data: { table_id: number; status: string }) {
        return apiClient.post('/pos/tables/update_status/', data);
    },

    // 获取可用桌台
    getAvailableTables(params?: { capacity?: number }) {
        return apiClient.get('/pos/tables/available/', {params});
    },

    // 获取 POS 仪表板数据
    getDashboard() {
        return apiClient.get('/pos/dashboard/');
    },

    // 获取 POS 统计数据
    getStatistics(date?: string) {
        return apiClient.get('/pos/statistics/', {params: {date}});
    },

    // 开始收银班次
    startShift(data: { shift_name: string }) {
        return apiClient.post('/pos/shift/start/', data);
    },

    // 结束收银班次
    endShift(data: { shift_id: number }) {
        return apiClient.post('/pos/shift/end/', data);
    }
};

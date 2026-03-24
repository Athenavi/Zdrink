import request from './request'

// POS 收银台 API
export const posApi = {
    // 快速下单
    quickOrder(data) {
        return request.post('/pos/pos/quick_order/', data)
    },

    // 扫描条码
    scanBarcode(data) {
        return request.post('/pos/pos/scan_barcode/', data)
    },

    // 拆分订单
    splitOrder(data) {
        return request.post('/pos/pos/split_order/', data)
    },

    // 合并订单
    mergeOrders(data) {
        return request.post('/pos/pos/merge_orders/', data)
    },

    // 获取桌台状态列表
    getTablesStatus(params = {}) {
        return request.get('/pos/tables/status/', {params})
    },

    // 更新桌台状态
    updateTableStatus(data) {
        return request.post('/pos/tables/update_status/', data)
    },

    // 获取可用桌台
    getAvailableTables(params = {}) {
        return request.get('/pos/tables/available/', {params})
    },

    // 获取 POS 仪表板数据
    getDashboard() {
        return request.get('/pos/dashboard/')
    },

    // 获取 POS 统计数据
    getStatistics(date) {
        return request.get('/pos/statistics/', {params: {date}})
    },

    // 开始收银班次
    startShift(data) {
        return request.post('/pos/shift/start/', data)
    },

    // 结束收银班次
    endShift(data) {
        return request.post('/pos/shift/end/', data)
    }
}

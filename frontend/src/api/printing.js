import request from './request'

// 打印管理 API
export const printingApi = {
    // 打印机管理
    getPrinters(params = {}) {
        return request.get('/printing/printers/', {params})
    },

    getPrinter(id) {
        return request.get(`/printing/printers/${id}/`)
    },

    createPrinter(data) {
        return request.post('/printing/printers/', data)
    },

    updatePrinter(id, data) {
        return request.put(`/printing/printers/${id}/`, data)
    },

    deletePrinter(id) {
        return request.delete(`/printing/printers/${id}/`)
    },

    // 测试打印
    testPrint(printerId, data) {
        return request.post(`/printing/printers/${printerId}/test_print/`, data)
    },

    // 获取打印机状态
    getPrinterStatus(printerId) {
        return request.get(`/printing/printers/${printerId}/status/`)
    },

    // 获取所有打印机状态
    getAllPrintersStatus() {
        return request.get('/printing/printers/status_all/')
    },

    // 打印模板管理
    getTemplates(params = {}) {
        return request.get('/printing/templates/', {params})
    },

    getTemplate(id) {
        return request.get(`/printing/templates/${id}/`)
    },

    createTemplate(data) {
        return request.post('/printing/templates/', data)
    },

    updateTemplate(id, data) {
        return request.put(`/printing/templates/${id}/`, data)
    },

    deleteTemplate(id) {
        return request.delete(`/printing/templates/${id}/`)
    },

    // 设置默认模板
    setDefaultTemplate(id) {
        return request.post(`/printing/templates/${id}/set_default/`)
    },

    // 打印任务管理
    getPrintTasks(params = {}) {
        return request.get('/printing/tasks/', {params})
    },

    getPrintTask(id) {
        return request.get(`/printing/tasks/${id}/`)
    },

    retryPrintTask(id) {
        return request.post(`/printing/tasks/${id}/retry/`)
    },

    // 打印日志
    getPrintLogs(params = {}) {
        return request.get('/printing/logs/', {params})
    },

    // 打印订单
    printOrder(data) {
        return request.post('/printing/print-order/', data)
    },

    // 自动打印订单
    autoPrintOrder(orderId) {
        return request.post(`/printing/auto-print-order/${orderId}/`)
    },

    // 获取打印统计
    getPrintStatistics(startDate, endDate) {
        return request.get('/printing/statistics/', {
            params: {start_date: startDate, end_date: endDate}
        })
    }
}

import apiClient from '@/lib/api';

// 打印管理 API
export const printingApi = {
    // 打印机管理
    getPrinters(params?: { shop_id?: number }) {
        return apiClient.get('/printing/printers/', {params});
    },

    getPrinter(id: number) {
        return apiClient.get(`/printing/printers/${id}/`);
    },

    createPrinter(data: any) {
        return apiClient.post('/printing/printers/', data);
    },

    updatePrinter(id: number, data: any) {
        return apiClient.put(`/printing/printers/${id}/`, data);
    },

    deletePrinter(id: number) {
        return apiClient.delete(`/printing/printers/${id}/`);
    },

    // 测试打印
    testPrint(printerId: number, data: any) {
        return apiClient.post(`/printing/printers/${printerId}/test_print/`, data);
    },

    // 获取打印机状态
    getPrinterStatus(printerId: number) {
        return apiClient.get(`/printing/printers/${printerId}/status/`);
    },

    // 获取所有打印机状态
    getAllPrintersStatus() {
        return apiClient.get('/printing/printers/status_all/');
    },

    // 打印模板管理
    getTemplates(params?: { shop_id?: number }) {
        return apiClient.get('/printing/templates/', {params});
    },

    getTemplate(id: number) {
        return apiClient.get(`/printing/templates/${id}/`);
    },

    createTemplate(data: any) {
        return apiClient.post('/printing/templates/', data);
    },

    updateTemplate(id: number, data: any) {
        return apiClient.put(`/printing/templates/${id}/`, data);
    },

    deleteTemplate(id: number) {
        return apiClient.delete(`/printing/templates/${id}/`);
    },

    // 设置默认模板
    setDefaultTemplate(id: number) {
        return apiClient.post(`/printing/templates/${id}/set_default/`);
    },

    // 打印任务管理
    getPrintTasks(params?: { status?: string }) {
        return apiClient.get('/printing/tasks/', {params});
    },

    getPrintTask(id: number) {
        return apiClient.get(`/printing/tasks/${id}/`);
    },

    retryPrintTask(id: number) {
        return apiClient.post(`/printing/tasks/${id}/retry/`);
    },

    // 打印日志
    getPrintLogs(params?: { level?: string }) {
        return apiClient.get('/printing/logs/', {params});
    },

    // 打印订单
    printOrder(data: { order_id: number; printer_id?: number }) {
        return apiClient.post('/printing/print-order/', data);
    },

    // 自动打印订单
    autoPrintOrder(orderId: number) {
        return apiClient.post(`/printing/auto-print-order/${orderId}/`);
    },

    // 获取打印统计
    getPrintStatistics(startDate: string, endDate: string) {
        return apiClient.get('/printing/statistics/', {
            params: {start_date: startDate, end_date: endDate}
        });
    }
};

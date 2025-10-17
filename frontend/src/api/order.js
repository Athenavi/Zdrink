import request from './request'

export const orderApi = {
  // 创建订单
  createOrder(orderData) {
    return request.post('/orders/orders/', orderData)
  },

  // 获取订单列表
  getOrders(params = {}) {
    return request.get('/orders/orders/my_orders/', { params })
  },

  // 获取订单详情
  getOrder(orderId) {
    return request.get(`/orders/orders/${orderId}/`)
  },

  // 取消订单
  cancelOrder(orderId, data = {}) {
    return request.post(`/orders/orders/${orderId}/cancel/`, data)
  },

  // 创建支付
  createPayment(paymentData) {
    return request.post('/payments/transactions/create_payment/', paymentData)
  }
}
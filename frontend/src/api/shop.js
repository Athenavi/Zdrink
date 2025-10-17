import request from './request'

export const shopApi = {
  // 获取店铺列表
  getShops(params = {}) {
    return request.get('/shops/', { params })
  },

  // 获取店铺详情
  getShop(shopId) {
    return request.get(`/shops/${shopId}/`)
  },

  // 获取当前用户关联的店铺
  getCurrentShops() {
    return request.get('/shops/current/')
  }
}
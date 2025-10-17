import request from './request'

export const productApi = {
  // 获取公开商品列表
  getPublicProducts(shopId, params = {}) {
    return request.get(`/products/public/products/`, {
      params: { ...params, shop_id: shopId }
    })
  },

  // 获取商品分类
  getCategories(shopId) {
    return request.get('/products/categories/', {
      params: { shop_id: shopId }
    })
  },

  // 获取商品详情
  getProduct(productId) {
    return request.get(`/products/products/${productId}/`)
  }
}
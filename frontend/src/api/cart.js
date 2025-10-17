import request from './request'

export const cartApi = {
  // 获取我的购物车
  getMyCart() {
    return request.get('/orders/carts/my_cart/')
  },

  // 添加到购物车
  addItem(itemData) {
    return request.post('/orders/carts/add_item/', itemData)
  },

  // 更新购物车商品
  updateItem(itemId, itemData) {
    return request.patch(`/orders/carts/items/${itemId}/`, itemData)
  },

  // 删除购物车商品
  removeItem(itemId) {
    return request.delete(`/orders/carts/items/${itemId}/`)
  },

  // 清空购物车
  clearCart() {
    return request.post('/orders/carts/clear/')
  }
}
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { cartApi } from '../api/cart'

export const useCartStore = defineStore('cart', () => {
  const cartItems = ref([])
  const cartInfo = ref(null)

  // 购物车总数量
  const totalQuantity = computed(() => {
    return cartItems.value.reduce((total, item) => total + item.quantity, 0)
  })

  // 购物车总金额
  const totalPrice = computed(() => {
    return cartItems.value.reduce((total, item) => total + item.total_price, 0)
  })

  // 获取购物车
  const getCart = async () => {
    try {
      const response = await cartApi.getMyCart()
      cartInfo.value = response.data
      cartItems.value = response.data.items || []
      return response
    } catch (error) {
      throw error
    }
  }

  // 添加到购物车
  const addToCart = async (productData) => {
    try {
      const response = await cartApi.addItem(productData)
      await getCart() // 重新获取购物车
      return response
    } catch (error) {
      throw error
    }
  }

  // 更新购物车商品数量
  const updateCartItem = async (itemId, quantity) => {
    try {
      if (quantity <= 0) {
        await removeCartItem(itemId)
      } else {
        const response = await cartApi.updateItem(itemId, { quantity })
        await getCart()
        return response
      }
    } catch (error) {
      throw error
    }
  }

  // 删除购物车商品
  const removeCartItem = async (itemId) => {
    try {
      const response = await cartApi.removeItem(itemId)
      await getCart()
      return response
    } catch (error) {
      throw error
    }
  }

  // 清空购物车
  const clearCart = async () => {
    try {
      const response = await cartApi.clearCart()
      cartItems.value = []
      cartInfo.value = null
      return response
    } catch (error) {
      throw error
    }
  }

  return {
    cartItems,
    cartInfo,
    totalQuantity,
    totalPrice,
    getCart,
    addToCart,
    updateCartItem,
    removeCartItem,
    clearCart
  }
})
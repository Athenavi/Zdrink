import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { userApi } from '../api/user'

export const useUserStore = defineStore('user', () => {
  const userInfo = ref(null)
  const token = ref(localStorage.getItem('token'))

  const isLoggedIn = computed(() => !!token.value)

  // 登录
  const login = async (credentials) => {
    try {
      const response = await userApi.login(credentials)
      token.value = response.data.access
      localStorage.setItem('token', response.data.access)
      localStorage.setItem('refresh_token', response.data.refresh)
      await getCurrentUser()
      return response
    } catch (error) {
      throw error
    }
  }

  // 注册
  const register = async (userData) => {
    try {
      const response = await userApi.register(userData)
      return response
    } catch (error) {
      throw error
    }
  }

  // 获取当前用户信息
  const getCurrentUser = async () => {
    try {
      const response = await userApi.getCurrentUser()
      userInfo.value = response.data
      return response
    } catch (error) {
      logout()
      throw error
    }
  }

  // 更新用户信息
  const updateUser = async (userData) => {
    try {
      const response = await userApi.updateProfile(userData)
      userInfo.value = { ...userInfo.value, ...response.data }
      return response
    } catch (error) {
      throw error
    }
  }

  // 退出登录
  const logout = () => {
    userInfo.value = null
    token.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('refresh_token')
  }

  // 初始化用户信息
  const initUser = async () => {
    if (token.value) {
      try {
        await getCurrentUser()
      } catch (error) {
        console.error('初始化用户信息失败:', error)
      }
    }
  }

  return {
    userInfo,
    token,
    isLoggedIn,
    login,
    register,
    getCurrentUser,
    updateUser,
    logout,
    initUser
  }
})
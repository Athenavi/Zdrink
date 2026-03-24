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
        console.log('开始登录...')
      const response = await userApi.login(credentials)
        console.log('登录响应:', response.data)
      
      token.value = response.data.access
      localStorage.setItem('token', response.data.access)
      localStorage.setItem('refresh_token', response.data.refresh)

        console.log('Token 已保存:', response.data.access.substring(0, 20) + '...')

        // 获取用户信息
        try {
            await getCurrentUser()
        } catch (error) {
            console.error('获取用户信息失败:', error)
            // 如果获取用户信息失败，但 token 已经设置，仍然认为登录成功
        }
      
      return response
    } catch (error) {
        console.error('登录失败:', error.response?.data)
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
          console.log('开始初始化用户信息...')
        await getCurrentUser()
          console.log('用户初始化成功:', userInfo.value?.username)
      } catch (error) {
          console.error('初始化用户信息失败:', error.message)
          // 只有当 token 无效时才清除它
          if (error.response?.status === 401) {
              console.log('Token 已失效，清除本地存储')
              logout()
          }
      }
    } else {
        console.log('未检测到 token，跳过初始化')
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
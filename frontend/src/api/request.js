import axios from 'axios'
import { useUserStore } from '../stores/user'
import { showFailToast } from 'vant'

// 创建axios实例
const request = axios.create({
  baseURL: '/api',
  timeout: 10000
})

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    const userStore = useUserStore()
    if (userStore.token) {
      config.headers.Authorization = `Bearer ${userStore.token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    const { response } = error

    if (response) {
      const { status, data } = response

      switch (status) {
        case 401:
          // 未授权，清除token并跳转到登录页
          const userStore = useUserStore()
          userStore.logout()
          window.location.href = '/login'
          break
        case 403:
          showFailToast('没有权限访问')
          break
        case 404:
          showFailToast('请求的资源不存在')
          break
        case 500:
          showFailToast('服务器内部错误')
          break
        default:
          showFailToast(data.message || data.detail || '请求失败')
      }
    } else {
      showFailToast('网络错误，请检查网络连接')
    }

    return Promise.reject(error)
  }
)

export default request
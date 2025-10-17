import request from './request'

export const userApi = {
  // 登录
  login(credentials) {
    return request.post('/auth/login/', credentials)
  },

  // 注册
  register(userData) {
    return request.post('/auth/register/', userData)
  },

  // 获取当前用户信息
  getCurrentUser() {
    return request.get('/auth/me/')
  },

  // 更新用户信息
  updateProfile(userData) {
    return request.patch('/auth/profile/update/', userData)
  },

  // 修改密码
  changePassword(passwordData) {
    return request.post('/auth/change-password/', passwordData)
  },

  // 退出登录
  logout() {
    return request.post('/auth/logout/')
  }
}
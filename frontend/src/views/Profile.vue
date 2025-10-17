<template>
  <div class="profile-page">
    <div class="container">
      <div class="header">
        <h1>个人中心</h1>
        <el-breadcrumb separator="/">
          <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
          <el-breadcrumb-item>个人中心</el-breadcrumb-item>
        </el-breadcrumb>
      </div>

      <div class="profile-content">
        <el-card class="profile-card">
          <template #header>
            <div class="card-header">
              <span>个人信息</span>
            </div>
          </template>

          <div class="user-info">
            <div class="avatar-section">
              <el-avatar :size="80" :src="userInfo.avatar" />
              <div class="avatar-actions">
                <el-button type="primary" text>更换头像</el-button>
              </div>
            </div>

            <el-form :model="userInfo" label-width="80px" class="info-form">
              <el-form-item label="用户名">
                <el-input v-model="userInfo.username" disabled />
              </el-form-item>
              <el-form-item label="手机号">
                <el-input v-model="userInfo.phone" />
              </el-form-item>
              <el-form-item label="邮箱">
                <el-input v-model="userInfo.email" />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="updateProfile">保存修改</el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-card>

        <el-card class="actions-card">
          <template #header>
            <div class="card-header">
              <span>快捷操作</span>
            </div>
          </template>

          <div class="quick-actions">
            <el-button
              type="primary"
              link
              @click="$router.push('/orders')"
            >
              <div class="action-item">
                <el-icon><Document /></el-icon>
                <span>我的订单</span>
              </div>
            </el-button>

            <el-button type="primary" link>
              <div class="action-item">
                <el-icon><Location /></el-icon>
                <span>收货地址</span>
              </div>
            </el-button>

            <el-button type="primary" link>
              <div class="action-item">
                <el-icon><Star /></el-icon>
                <span>我的收藏</span>
              </div>
            </el-button>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Document, Location, Star } from '@element-plus/icons-vue'

const userInfo = ref({
  username: 'testuser',
  phone: '13800138000',
  email: 'test@example.com',
  avatar: 'https://via.placeholder.com/80'
})

const updateProfile = async () => {
  try {
    // 这里调用更新用户信息的API
    ElMessage.success('个人信息更新成功')
  } catch (error) {
    console.error('更新失败:', error)
    ElMessage.error('更新失败')
  }
}
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 20px 0;
}

.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 20px;
}

.header {
  margin-bottom: 30px;
}

.header h1 {
  margin: 0 0 10px 0;
  color: #333;
}

.profile-content {
  display: grid;
  gap: 20px;
}

.profile-card, .actions-card {
  border-radius: 8px;
}

.card-header {
  font-weight: bold;
  color: #333;
}

.user-info {
  display: flex;
  gap: 40px;
  align-items: flex-start;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.info-form {
  flex: 1;
}

.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
}

:deep(.el-button--link) {
  justify-content: flex-start;
  padding: 8px 0;
}
</style>
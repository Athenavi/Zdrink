<template>
  <div class="login-page">
    <app-header title="登录" />

    <div class="login-container">
      <div class="login-logo">
        <van-image src="/logo.svg" width="80" height="80" />
        <h2>Zdrink点餐</h2>
      </div>

      <van-form @submit="handleLogin" class="login-form">
        <van-cell-group inset>
          <van-field
            v-model="form.username"
            name="username"
            label="用户名"
            placeholder="请输入用户名"
            :rules="[{ required: true, message: '请输入用户名' }]"
            left-icon="user-o"
          />
          <van-field
            v-model="form.password"
            type="password"
            name="password"
            label="密码"
            placeholder="请输入密码"
            :rules="[{ required: true, message: '请输入密码' }]"
            left-icon="lock-o"
          />
        </van-cell-group>

        <div class="form-actions">
          <van-button
            round
            block
            type="primary"
            native-type="submit"
            :loading="loading"
          >
            登录
          </van-button>
        </div>
      </van-form>

      <div class="login-links">
        <router-link to="/register" class="link">立即注册</router-link>
        <span class="divider">|</span>
        <a href="#" class="link" @click.prevent="handleForgetPassword">忘记密码</a>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showSuccessToast, showFailToast } from 'vant'
import { useUserStore } from '../stores/user'
import AppHeader from '../components/AppHeader.vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const loading = ref(false)
const form = reactive({
  username: '',
  password: ''
})

const handleLogin = async () => {
  loading.value = true

  try {
    await userStore.login(form)
    showSuccessToast('登录成功')

    // 跳转到目标页面或首页
    const redirect = route.query.redirect || '/home'
    router.push(redirect)
  } catch (error) {
    console.error('登录失败:', error)
    showFailToast('登录失败，请检查用户名和密码')
  } finally {
    loading.value = false
  }
}

const handleForgetPassword = () => {
  showFailToast('请联系管理员重置密码')
}
</script>
<style scoped lang="scss">
@use '../styles/variables' as *;
@use "sass:color";
.login-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #1989fa, #0081ff);

  .login-container {
    padding: 40px 20px;

    .login-logo {
      text-align: center;
      margin-bottom: 40px;

      h2 {
        margin: 15px 0 0 0;
        color: white;
        font-size: $font-size-xl;
      }
    }

    .login-form {
      .van-cell-group {
        background: transparent;

        :deep(.van-cell) {
          background: rgba(255, 255, 255, 0.9);
          border-radius: $border-radius;
          margin-bottom: 15px;
        }
      }

      .form-actions {
        margin: 30px 0;

        .van-button {
          height: 44px;
          font-size: $font-size-lg;
        }
      }
    }

    .login-links {
      text-align: center;

      .link {
        color: white;
        text-decoration: none;
        font-size: $font-size-md;

        &:hover {
          text-decoration: underline;
        }
      }

      .divider {
        color: white;
        margin: 0 15px;
      }
    }
  }
}
</style>
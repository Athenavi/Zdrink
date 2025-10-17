<template>
  <div class="register-page">
    <app-header title="注册" />

    <div class="register-container">
      <div class="register-logo">
        <van-image src="/logo.svg" width="80" height="80" />
        <h2>注册Zdrink账号</h2>
      </div>

      <van-form @submit="handleRegister" class="register-form">
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
            v-model="form.email"
            name="email"
            label="邮箱"
            placeholder="请输入邮箱"
            :rules="[
              { required: true, message: '请输入邮箱' },
              { validator: validateEmail, message: '邮箱格式不正确' }
            ]"
            left-icon="envelop-o"
          />
          <van-field
            v-model="form.phone"
            name="phone"
            label="手机号"
            placeholder="请输入手机号"
            :rules="[
              { required: true, message: '请输入手机号' },
              { validator: validatePhone, message: '手机号格式不正确' }
            ]"
            left-icon="phone-o"
          />
          <van-field
            v-model="form.password"
            type="password"
            name="password"
            label="密码"
            placeholder="请输入密码"
            :rules="[
              { required: true, message: '请输入密码' },
              { validator: validatePassword, message: '密码至少6位' }
            ]"
            left-icon="lock-o"
          />
          <van-field
            v-model="form.password2"
            type="password"
            name="password2"
            label="确认密码"
            placeholder="请再次输入密码"
            :rules="[
              { required: true, message: '请再次输入密码' },
              { validator: validatePassword2, message: '两次密码不一致' }
            ]"
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
            注册
          </van-button>
        </div>
      </van-form>

      <div class="register-links">
        <router-link to="/login" class="link">已有账号？立即登录</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { showSuccessToast, showFailToast } from 'vant'
import { useUserStore } from '../stores/user'
import AppHeader from '../components/AppHeader.vue'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const form = reactive({
  username: '',
  email: '',
  phone: '',
  password: '',
  password2: '',
  user_type: 'customer'
})

const validateEmail = (value) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(value)
}

const validatePhone = (value) => {
  const phoneRegex = /^1[3-9]\d{9}$/
  return phoneRegex.test(value)
}

const validatePassword = (value) => {
  return value.length >= 6
}

const validatePassword2 = (value) => {
  return value === form.password
}

const handleRegister = async () => {
  loading.value = true

  try {
    await userStore.register(form)
    showSuccessToast('注册成功')

    // 自动登录
    await userStore.login({
      username: form.username,
      password: form.password
    })

    showSuccessToast('自动登录成功')
    router.push('/home')
  } catch (error) {
    console.error('注册失败:', error)
    const errorMsg = error.response?.data?.message || error.response?.data?.detail || '注册失败'
    showFailToast(errorMsg)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
.register-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #1989fa, #0081ff);

  .register-container {
    padding: 40px 20px;

    .register-logo {
      text-align: center;
      margin-bottom: 40px;

      h2 {
        margin: 15px 0 0 0;
        color: white;
      }
    }

    .register-form {
      .van-cell-group {
        background: transparent;

        :deep(.van-cell) {
          background: rgba(255, 255, 255, 0.9);
          margin-bottom: 15px;
        }
      }

      .form-actions {
        margin: 30px 0;

        .van-button {
          height: 44px;
        }
      }
    }

    .register-links {
      text-align: center;

      .link {
        color: white;
        text-decoration: none;

        &:hover {
          text-decoration: underline;
        }
      }
    }
  }
}
</style>
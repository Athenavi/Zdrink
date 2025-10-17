<template>
  <div class="not-found-page">
    <app-header title="页面不存在" />

    <div class="not-found-content">
      <van-empty image="error" description="抱歉，页面不存在">
        <van-button type="primary" round @click="goHome">
          返回首页
        </van-button>
      </van-empty>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import AppHeader from '../components/AppHeader.vue'

const router = useRouter()

const goHome = () => {
  router.push('/home')
}
</script>

<style scoped lang="scss">
.not-found-page {
  .not-found-content {
    padding-top: 100px;
  }
}
</style>
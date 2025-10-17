<template>
  <van-nav-bar
    :title="title"
    :left-arrow="showBack"
    @click-left="handleBack"
    fixed
    placeholder
  >
    <template #right v-if="showCart">
      <van-badge :content="cartStore.totalQuantity" max="99">
        <van-icon name="shopping-cart-o" size="18" @click="goToCart" />
      </van-badge>
    </template>
  </van-nav-bar>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useCartStore } from '../stores/cart'

const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  showBack: {
    type: Boolean,
    default: true
  },
  showCart: {
    type: Boolean,
    default: false
  }
})

const router = useRouter()
const cartStore = useCartStore()

const handleBack = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/home')
  }
}

const goToCart = () => {
  router.push('/cart')
}
</script>

<style scoped>
.van-nav-bar {
  background: linear-gradient(135deg, #1989fa, #0081ff);

  :deep(.van-nav-bar__title) {
    color: white;
    font-weight: bold;
  }

  :deep(.van-nav-bar__arrow) {
    color: white;
    font-size: 16px;
  }

  :deep(.van-icon) {
    color: white;
  }
}
</style>
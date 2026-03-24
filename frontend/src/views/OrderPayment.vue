<template>
  <div class="payment-page">
    <app-header title="订单支付"/>

    <div class="container">
      <!-- 订单信息 -->
      <div class="order-info-section">
        <h2>订单信息</h2>
        <div class="info-item">
          <span class="label">订单号：</span>
          <span class="value">{{ orderInfo.order_number }}</span>
        </div>
        <div class="info-item">
          <span class="label">订单金额：</span>
          <span class="value amount">¥{{ orderInfo.total_amount }}</span>
        </div>
        <div class="info-item">
          <span class="label">支付方式：</span>
          <span class="value">{{ getPaymentMethodName(paymentMethod) }}</span>
        </div>
      </div>

      <!-- 支付方式 -->
      <div class="payment-method-section">
        <h2>选择支付方式</h2>
        <van-radio-group v-model="selectedPaymentMethod">
          <van-cell-group>
            <van-cell
                v-for="method in paymentMethods"
                :key="method.value"
                clickable
                @click="selectedPaymentMethod = method.value"
            >
              <template #title>
                <van-image :src="method.icon" class="payment-icon"/>
                <span>{{ method.name }}</span>
              </template>
              <template #right-icon>
                <van-radio :name="method.value"/>
              </template>
            </van-cell>
          </van-cell-group>
        </van-radio-group>
      </div>

      <!-- 支付按钮 -->
      <div class="payment-actions">
        <van-button
            :loading="paying"
            block
            round
            type="primary"
            @click="handlePayment"
        >
          {{ paying ? '支付中...' : `立即支付 ¥${orderInfo.total_amount}` }}
        </van-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import {onMounted, ref} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {showDialog, showSuccessToast, showToast} from 'vant'
import AppHeader from '@/components/AppHeader.vue'
import {orderApi} from '@/api/order'

const route = useRoute()
const router = useRouter()

const orderId = route.params.id
const orderInfo = ref({
  order_number: '',
  total_amount: '0.00'
})

const paymentMethod = ref(route.query.method || 'wechat')
const selectedPaymentMethod = ref(paymentMethod.value)

const paying = ref(false)

const paymentMethods = [
  {
    value: 'wechat',
    name: '微信支付',
    icon: 'https://img.yzcdn.cn/public_files/2019/03/05/2b6c0fbc2e07a1d8b7e3f5f6e8a8f8e8.png'
  },
  {
    value: 'alipay',
    name: '支付宝',
    icon: 'https://img.yzcdn.cn/public_files/2019/03/05/2b6c0fbc2e07a1d8b7e3f5f6e8a8f8e8.png'
  },
  {value: 'cash', name: '现金支付', icon: ''}
]

const getPaymentMethodName = (method) => {
  const names = {
    wechat: '微信支付',
    alipay: '支付宝',
    cash: '现金支付'
  }
  return names[method] || method
}

const loadOrderInfo = async () => {
  try {
    const response = await orderApi.getOrderDetail(orderId)
    orderInfo.value = response.data
  } catch (error) {
    console.error('加载订单信息失败:', error)
    showToast('加载订单信息失败')
  }
}

const handlePayment = async () => {
  if (!selectedPaymentMethod.value) {
    showToast('请选择支付方式')
    return
  }

  paying.value = true

  try {
    // TODO: 调用支付 API
    // 这里模拟支付流程
    await new Promise(resolve => setTimeout(resolve, 2000))

    showSuccessToast('支付成功')

    // 跳转到订单详情
    setTimeout(() => {
      router.push({
        name: 'OrderDetail',
        params: {id: orderId}
      })
    }, 1500)
  } catch (error) {
    console.error('支付失败:', error)
    showDialog({
      title: '支付失败',
      message: error.message || '支付失败，请重试'
    })
  } finally {
    paying.value = false
  }
}

onMounted(() => {
  loadOrderInfo()
})
</script>

<style lang="scss" scoped>
@use '../styles/variables.scss' as *;

.payment-page {
  min-height: 100vh;
  background: $background-color;
  padding-bottom: 80px;
}

.container {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.order-info-section,
.payment-method-section {
  background: white;
  border-radius: $border-radius-lg;
  padding: 20px;
  margin-bottom: 20px;

  h2 {
    margin: 0 0 20px 0;
    font-size: $font-size-lg;
    color: #333;
  }
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;

  .label {
    color: #666;
  }

  .value {
    color: #333;
    font-weight: bold;

    &.amount {
      color: $primary-color;
      font-size: $font-size-lg;
    }
  }
}

.payment-icon {
  width: 24px;
  height: 24px;
  vertical-align: middle;
  margin-right: 8px;
}

.payment-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 15px;
  background: white;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
}
</style>

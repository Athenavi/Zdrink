<template>
  <div class="order-detail">
    <div class="container">
      <!-- 订单状态 -->
      <div class="order-status">
        <h2>订单状态: {{ getStatusText(orderDetail.status) }}</h2>
      </div>

      <!-- 订单信息 -->
      <div class="order-info">
        <h3>订单信息</h3>
        <p>订单号: {{ orderDetail.order_number }}</p>
        <p>创建时间: {{ formatTime(orderDetail.created_at) }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { orderApi } from '@/api/order'

const route = useRoute()
const orderDetail = ref({})

const fetchOrderDetail = async () => {
  try {
    const response = await orderApi.getOrder(route.params.id)
    orderDetail.value = response.data
  } catch (error) {
    console.error('获取订单详情失败:', error)
  }
}

const getStatusText = (status) => {
  const statusMap = {
    pending: '待确认',
    confirmed: '已确认',
    completed: '已完成',
    cancelled: '已取消'
  }
  return statusMap[status] || status
}

const formatTime = (timeString) => {
  return new Date(timeString).toLocaleString()
}

onMounted(() => {
  fetchOrderDetail()
})
</script>
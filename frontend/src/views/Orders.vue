<template>
  <div class="orders-page">
    <div class="container">
      <div class="header">
        <h1>我的订单</h1>
        <el-breadcrumb separator="/">
          <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
          <el-breadcrumb-item>我的订单</el-breadcrumb-item>
        </el-breadcrumb>
      </div>

      <!-- 订单状态筛选 -->
      <div class="filter-section">
        <el-radio-group v-model="filterStatus" @change="fetchOrders">
          <el-radio-button label="all">全部</el-radio-button>
          <el-radio-button label="pending">待确认</el-radio-button>
          <el-radio-button label="confirmed">已确认</el-radio-button>
          <el-radio-button label="completed">已完成</el-radio-button>
          <el-radio-button label="cancelled">已取消</el-radio-button>
        </el-radio-group>
      </div>

      <!-- 订单列表 -->
      <div class="orders-list">
        <div v-if="loading" class="loading">
          <el-skeleton :rows="5" animated />
        </div>

        <div v-else-if="orders.length === 0" class="empty">
          <el-empty description="暂无订单" />
        </div>

        <div v-else class="order-items">
          <div
            v-for="order in orders"
            :key="order.id"
            class="order-item"
            @click="viewOrderDetail(order.id)"
          >
            <div class="order-header">
              <div class="order-info">
                <span class="order-number">订单号: {{ order.order_number }}</span>
                <span class="order-time">{{ formatTime(order.created_at) }}</span>
              </div>
              <div class="order-status">
                <el-tag :type="getStatusType(order.status)">
                  {{ getStatusText(order.status) }}
                </el-tag>
              </div>
            </div>

            <div class="order-content">
              <div class="products">
                <div
                  v-for="item in order.items"
                  :key="item.id"
                  class="product-item"
                >
                  <img :src="item.product_image" :alt="item.product_name" class="product-img">
                  <div class="product-info">
                    <h4>{{ item.product_name }}</h4>
                    <p class="sku" v-if="item.sku_name">{{ item.sku_name }}</p>
                    <p class="quantity">×{{ item.quantity }}</p>
                  </div>
                  <div class="price">¥{{ item.price }}</div>
                </div>
              </div>
            </div>

            <div class="order-footer">
              <div class="total-amount">
                实付: <span class="amount">¥{{ order.total_amount }}</span>
              </div>
              <div class="actions">
                <el-button
                  v-if="order.status === 'pending'"
                  size="small"
                  @click.stop="cancelOrder(order)"
                >
                  取消订单
                </el-button>
                <el-button
                  v-if="order.status === 'confirmed'"
                  type="primary"
                  size="small"
                  @click.stop="payOrder(order)"
                >
                  立即支付
                </el-button>
                <el-button
                  v-if="order.status === 'completed'"
                  size="small"
                  @click.stop="viewOrderDetail(order.id)"
                >
                  查看详情
                </el-button>
              </div>
            </div>
          </div>
        </div>

        <!-- 分页 -->
        <div class="pagination" v-if="total > pageSize">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :total="total"
            layout="prev, pager, next, jumper"
            @current-change="fetchOrders"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { orderApi } from '@/api/order'

const router = useRouter()

// 响应式数据
const orders = ref([])
const loading = ref(false)
const filterStatus = ref('all')
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

// 状态映射
const statusMap = {
  pending: '待确认',
  confirmed: '已确认',
  completed: '已完成',
  cancelled: '已取消'
}

const statusTypeMap = {
  pending: 'warning',
  confirmed: 'primary',
  completed: 'success',
  cancelled: 'info'
}

// 获取状态文本
const getStatusText = (status) => {
  return statusMap[status] || status
}

// 获取状态标签类型
const getStatusType = (status) => {
  return statusTypeMap[status] || 'info'
}

// 格式化时间
const formatTime = (timeString) => {
  return new Date(timeString).toLocaleString()
}

// 获取订单列表
const fetchOrders = async () => {
  try {
    loading.value = true

    const params = {
      page: currentPage.value,
      page_size: pageSize.value
    }

    if (filterStatus.value !== 'all') {
      params.status = filterStatus.value
    }

    const response = await orderApi.getOrders(params)
    orders.value = response.data.results || response.data
    total.value = response.data.count || orders.value.length

  } catch (error) {
    console.error('获取订单列表失败:', error)
    ElMessage.error('获取订单列表失败')
  } finally {
    loading.value = false
  }
}

// 查看订单详情
const viewOrderDetail = (orderId) => {
  router.push({
    name: 'OrderDetail',
    params: { id: orderId }
  })
}

// 取消订单
const cancelOrder = async (order) => {
  try {
    await ElMessageBox.confirm(
      '确定要取消这个订单吗？',
      '取消订单',
      {
        confirmButtonText: '确定',
        cancelButtonText: '再想想',
        type: 'warning'
      }
    )

    await orderApi.cancelOrder(order.id)
    ElMessage.success('订单已取消')
    fetchOrders() // 刷新列表

  } catch (error) {
    if (error !== 'cancel') {
      console.error('取消订单失败:', error)
      ElMessage.error('取消订单失败')
    }
  }
}

// 支付订单
const payOrder = async (order) => {
  try {
    ElMessage.info('支付功能开发中...')
    // 这里可以调用支付API
    // const paymentData = {
    //   order_id: order.id,
    //   payment_method: 'wechat'
    // }
    // await orderApi.createPayment(paymentData)
  } catch (error) {
    console.error('支付失败:', error)
    ElMessage.error('支付失败')
  }
}

onMounted(() => {
  fetchOrders()
})
</script>

<style scoped>
.orders-page {
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

.filter-section {
  background: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.orders-list {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.order-item {
  padding: 20px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background-color 0.3s;
}

.order-item:hover {
  background-color: #f9f9f9;
}

.order-item:last-child {
  border-bottom: none;
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.order-info {
  display: flex;
  flex-direction: column;
}

.order-number {
  font-weight: bold;
  color: #333;
  margin-bottom: 5px;
}

.order-time {
  color: #999;
  font-size: 14px;
}

.order-content {
  margin-bottom: 15px;
}

.products {
  space-y: 12px;
}

.product-item {
  display: flex;
  align-items: center;
  padding: 10px 0;
}

.product-img {
  width: 50px;
  height: 50px;
  border-radius: 6px;
  margin-right: 12px;
  object-fit: cover;
}

.product-info {
  flex: 1;
}

.product-info h4 {
  margin: 0 0 5px 0;
  color: #333;
}

.sku {
  margin: 0;
  color: #999;
  font-size: 12px;
}

.quantity {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.price {
  color: #e4393c;
  font-weight: bold;
}

.order-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.total-amount {
  color: #333;
}

.amount {
  color: #e4393c;
  font-size: 18px;
  font-weight: bold;
}

.pagination {
  padding: 20px;
  display: flex;
  justify-content: center;
}

.loading {
  padding: 40px 20px;
}

.empty {
  padding: 60px 20px;
}
</style>
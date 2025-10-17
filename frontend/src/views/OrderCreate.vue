<template>
  <div class="order-create">
    <div class="container">
      <!-- 头部 -->
      <div class="header">
        <h1>确认订单</h1>
        <el-breadcrumb separator="/">
          <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
          <el-breadcrumb-item :to="{ path: '/cart' }">购物车</el-breadcrumb-item>
          <el-breadcrumb-item>确认订单</el-breadcrumb-item>
        </el-breadcrumb>
      </div>

      <!-- 订单内容 -->
      <div class="order-content">
        <!-- 收货信息 -->
        <div class="section">
          <div class="section-header">
            <h2>取餐信息</h2>
          </div>
          <div class="customer-info">
            <el-form :model="orderForm" :rules="rules" ref="orderFormRef">
              <el-form-item label="订单类型" prop="order_type">
                <el-radio-group v-model="orderForm.order_type">
                  <el-radio label="takeaway">外卖</el-radio>
                  <el-radio label="dine_in">堂食</el-radio>
                </el-radio-group>
              </el-form-item>

              <el-form-item label="顾客姓名" prop="customer_name">
                <el-input
                  v-model="orderForm.customer_name"
                  placeholder="请输入顾客姓名"
                  maxlength="20"
                ></el-input>
              </el-form-item>

              <el-form-item label="联系电话" prop="customer_phone">
                <el-input
                  v-model="orderForm.customer_phone"
                  placeholder="请输入联系电话"
                  maxlength="11"
                ></el-input>
              </el-form-item>

              <el-form-item
                label="取餐时间"
                prop="pickup_time"
                v-if="orderForm.order_type === 'takeaway'"
              >
                <el-date-picker
                  v-model="orderForm.pickup_time"
                  type="datetime"
                  placeholder="选择取餐时间"
                  :disabled-date="disabledDate"
                  :shortcuts="shortcuts"
                />
              </el-form-item>
            </el-form>
          </div>
        </div>

        <!-- 商品列表 -->
        <div class="section">
          <div class="section-header">
            <h2>商品清单</h2>
          </div>
          <div class="product-list">
            <div
              v-for="item in cartItems"
              :key="item.id"
              class="product-item"
            >
              <div class="product-info">
                <img :src="item.product_image" :alt="item.product_name" class="product-img">
                <div class="product-details">
                  <h4>{{ item.product_name }}</h4>
                  <p class="sku-info" v-if="item.sku_name">{{ item.sku_name }}</p>
                  <p class="price">¥{{ item.price }}</p>
                </div>
              </div>
              <div class="quantity">
                <span class="quantity-text">×{{ item.quantity }}</span>
              </div>
              <div class="subtotal">
                ¥{{ (item.price * item.quantity).toFixed(2) }}
              </div>
            </div>
          </div>
        </div>

        <!-- 订单汇总 -->
        <div class="section">
          <div class="order-summary">
            <div class="summary-item">
              <span>商品总额</span>
              <span>¥{{ totalAmount.toFixed(2) }}</span>
            </div>
            <div class="summary-item">
              <span>配送费</span>
              <span>¥{{ deliveryFee.toFixed(2) }}</span>
            </div>
            <div class="summary-item total">
              <span>实付金额</span>
              <span class="total-amount">¥{{ (totalAmount + deliveryFee).toFixed(2) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部操作栏 -->
      <div class="footer-actions">
        <div class="actions-container">
          <div class="total-price">
            合计: <span class="price">¥{{ (totalAmount + deliveryFee).toFixed(2) }}</span>
          </div>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            @click="handleCreateOrder"
          >
            {{ loading ? '创建订单中...' : '提交订单' }}
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import { orderApi } from '@/api/order'

const router = useRouter()
const loading = ref(false)
const orderFormRef = ref()

// 订单表单数据
const orderForm = ref({
  order_type: 'takeaway',
  customer_name: '',
  customer_phone: '',
  pickup_time: new Date(Date.now() + 30 * 60 * 1000), // 默认30分钟后
  cart_id: null
})

// 购物车商品列表
const cartItems = ref([])

// 验证规则
const rules = {
  customer_name: [
    { required: true, message: '请输入顾客姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '姓名长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  customer_phone: [
    { required: true, message: '请输入联系电话', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
  ],
  pickup_time: [
    { required: true, message: '请选择取餐时间', trigger: 'change' }
  ]
}

// 日期选择器配置
const disabledDate = (time) => {
  return time.getTime() < Date.now() - 24 * 60 * 60 * 1000
}

const shortcuts = [
  {
    text: '30分钟后',
    value: new Date(Date.now() + 30 * 60 * 1000)
  },
  {
    text: '1小时后',
    value: new Date(Date.now() + 60 * 60 * 1000)
  },
  {
    text: '2小时后',
    value: new Date(Date.now() + 2 * 60 * 60 * 1000)
  }
]

// 计算属性
const totalAmount = computed(() => {
  return cartItems.value.reduce((total, item) => {
    return total + (item.price * item.quantity)
  }, 0)
})

const deliveryFee = computed(() => {
  return orderForm.value.order_type === 'takeaway' ? 5 : 0 // 外卖配送费5元
})

// 获取购物车数据
const fetchCartData = async () => {
  try {
    // 这里应该调用获取购物车商品的API
    // 暂时使用模拟数据
    cartItems.value = [
      {
        id: 1,
        product_name: '珍珠奶茶',
        product_image: 'https://via.placeholder.com/80',
        sku_name: '大杯/少糖',
        price: 18.00,
        quantity: 2
      },
      {
        id: 2,
        product_name: '拿铁咖啡',
        product_image: 'https://via.placeholder.com/80',
        sku_name: '中杯/热',
        price: 25.00,
        quantity: 1
      }
    ]

    // 设置购物车ID（实际应该从购物车API获取）
    orderForm.value.cart_id = 1
  } catch (error) {
    console.error('获取购物车数据失败:', error)
    ElMessage.error('获取购物车数据失败')
  }
}

// 创建订单
const handleCreateOrder = async () => {
  try {
    // 表单验证
    await orderFormRef.value.validate()

    loading.value = true

    // 准备订单数据
    const orderData = {
      ...orderForm.value,
      pickup_time: orderForm.value.pickup_time.toISOString()
    }

    // 调用创建订单API
    const response = await orderApi.createOrder(orderData)

    ElMessage.success('订单创建成功！')

    // 跳转到订单详情页面
    router.push({
      name: 'OrderDetail',
      params: { id: response.data.id }
    })

  } catch (error) {
    console.error('创建订单失败:', error)
    if (error.response?.data) {
      ElMessage.error(error.response.data.message || '创建订单失败')
    } else {
      ElMessage.error('创建订单失败，请重试')
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchCartData()
})
</script>

<style scoped>
.order-create {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 80px;
}

.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  margin-bottom: 30px;
}

.header h1 {
  margin: 0 0 10px 0;
  color: #333;
}

.section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.section-header {
  border-bottom: 1px solid #eee;
  padding-bottom: 15px;
  margin-bottom: 20px;
}

.section-header h2 {
  margin: 0;
  color: #333;
  font-size: 18px;
}

.customer-info {
  max-width: 500px;
}

.product-item {
  display: flex;
  align-items: center;
  padding: 15px 0;
  border-bottom: 1px solid #f5f5f5;
}

.product-item:last-child {
  border-bottom: none;
}

.product-info {
  display: flex;
  align-items: center;
  flex: 1;
}

.product-img {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  margin-right: 15px;
  object-fit: cover;
}

.product-details h4 {
  margin: 0 0 5px 0;
  color: #333;
}

.sku-info {
  margin: 0;
  color: #999;
  font-size: 14px;
}

.price {
  margin: 5px 0 0 0;
  color: #e4393c;
  font-weight: bold;
}

.quantity {
  width: 80px;
  text-align: center;
}

.quantity-text {
  color: #666;
}

.subtotal {
  width: 100px;
  text-align: right;
  color: #e4393c;
  font-weight: bold;
}

.order-summary {
  max-width: 300px;
  margin-left: auto;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  color: #666;
}

.summary-item.total {
  border-top: 1px solid #eee;
  margin-top: 8px;
  padding-top: 12px;
  font-size: 16px;
  color: #333;
}

.total-amount {
  color: #e4393c;
  font-size: 20px;
  font-weight: bold;
}

.footer-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  border-top: 1px solid #eee;
  padding: 15px 0;
}

.actions-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.total-price {
  font-size: 18px;
  color: #333;
}

.total-price .price {
  color: #e4393c;
  font-size: 24px;
  font-weight: bold;
}

:deep(.el-button) {
  min-width: 120px;
  height: 48px;
  font-size: 16px;
}
</style>
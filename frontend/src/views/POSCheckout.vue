<template>
  <div class="pos-checkout">
    <div class="container">
      <!-- 头部 -->
      <div class="header">
        <h1>POS 收银台</h1>
        <el-breadcrumb separator="/">
          <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
          <el-breadcrumb-item>收银台</el-breadcrumb-item>
        </el-breadcrumb>
      </div>

      <!-- 主体内容 -->
      <div class="main-content">
        <!-- 左侧：商品录入区 -->
        <div class="left-panel">
          <!-- 扫码枪输入 -->
          <div class="barcode-section">
            <el-input
                v-model="barcode"
                clearable
                placeholder="扫描商品条码或手动输入"
                prefix-icon="Search"
                @keyup.enter="handleScanBarcode"
            >
              <template #append>
                <el-button @click="handleScanBarcode">
                  <el-icon>
                    <Search/>
                  </el-icon>
                  扫描
                </el-button>
              </template>
            </el-input>
          </div>

          <!-- 已选商品列表 -->
          <div class="cart-section">
            <div class="section-title">已选商品</div>

            <div v-if="cartItems.length === 0" class="empty-cart">
              <el-empty description="请扫描或添加商品"/>
            </div>

            <div v-else class="cart-items">
              <div
                  v-for="(item, index) in cartItems"
                  :key="index"
                  class="cart-item"
              >
                <div class="item-info">
                  <img :src="item.image || '/images/product-placeholder.jpg'" class="item-image"/>
                  <div class="item-details">
                    <div class="item-name">{{ item.name }}</div>
                    <div v-if="item.sku" class="item-sku">{{ item.sku }}</div>
                    <div class="item-price">¥{{ item.price }}</div>
                  </div>
                </div>

                <div class="item-actions">
                  <el-input-number
                      v-model="item.quantity"
                      :max="99"
                      :min="1"
                      controls-position="right"
                      size="small"
                      @change="updateQuantity(index, $event)"
                  />
                  <el-button
                      size="small"
                      type="danger"
                      @click="removeItem(index)"
                  >
                    删除
                  </el-button>
                </div>
              </div>
            </div>
          </div>

          <!-- 快速下单表单 -->
          <div class="order-form">
            <el-form ref="orderFormRef" :model="orderForm" :rules="rules" label-width="80px">
              <el-form-item label="订单类型" prop="order_type">
                <el-radio-group v-model="orderForm.order_type">
                  <el-radio label="dine_in">堂食</el-radio>
                  <el-radio label="takeaway">外带</el-radio>
                  <el-radio label="delivery">外卖</el-radio>
                </el-radio-group>
              </el-form-item>

              <el-form-item v-if="orderForm.order_type === 'dine_in'" label="桌台号">
                <el-select v-model="orderForm.table_number" placeholder="选择桌台" style="width: 100%">
                  <el-option
                      v-for="table in availableTables"
                      :key="table.id"
                      :label="`${table.table_number} (${table.table_name})`"
                      :value="table.table_number"
                  />
                </el-select>
              </el-form-item>

              <el-form-item label="顾客姓名" prop="customer_name">
                <el-input
                    v-model="orderForm.customer_name"
                    maxlength="20"
                    placeholder="请输入顾客姓名"
                />
              </el-form-item>

              <el-form-item label="联系电话" prop="customer_phone">
                <el-input
                    v-model="orderForm.customer_phone"
                    maxlength="11"
                    placeholder="请输入联系电话"
                />
              </el-form-item>

              <el-form-item label="支付方式" prop="payment_method">
                <el-radio-group v-model="orderForm.payment_method">
                  <el-radio label="cash">现金</el-radio>
                  <el-radio label="wechat">微信</el-radio>
                  <el-radio label="alipay">支付宝</el-radio>
                  <el-radio label="card">银行卡</el-radio>
                </el-radio-group>
              </el-form-item>

              <el-form-item label="备注">
                <el-input
                    v-model="orderForm.remark"
                    :rows="2"
                    placeholder="选填备注信息"
                    type="textarea"
                />
              </el-form-item>
            </el-form>
          </div>
        </div>

        <!-- 右侧：结算区 -->
        <div class="right-panel">
          <div class="summary-card">
            <h3>订单汇总</h3>

            <div class="summary-list">
              <div class="summary-item">
                <span>商品数量:</span>
                <span>{{ totalQuantity }}件</span>
              </div>
              <div class="summary-item">
                <span>商品总额:</span>
                <span class="amount">¥{{ totalAmount.toFixed(2) }}</span>
              </div>
              <div v-if="discountAmount > 0" class="summary-item">
                <span>优惠金额:</span>
                <span class="amount discount">-¥{{ discountAmount.toFixed(2) }}</span>
              </div>
              <div v-if="deliveryFee > 0" class="summary-item">
                <span>配送费:</span>
                <span class="amount">¥{{ deliveryFee.toFixed(2) }}</span>
              </div>
              <el-divider/>
              <div class="summary-item total">
                <span>实收金额:</span>
                <span class="amount total-amount">¥{{ finalAmount.toFixed(2) }}</span>
              </div>
            </div>

            <!-- 快捷操作 -->
            <div class="quick-actions">
              <el-button :disabled="cartItems.length === 0" @click="handleApplyDiscount">
                应用折扣
              </el-button>
              <el-button :disabled="cartItems.length === 0" @click="handleClearCart">
                清空
              </el-button>
            </div>

            <!-- 提交订单按钮 -->
            <el-button
                :disabled="cartItems.length === 0"
                :loading="submitting"
                block
                size="large"
                type="primary"
                @click="handleSubmitOrder"
            >
              {{ submitting ? '提交中...' : '提交订单' }}
            </el-button>
          </div>

          <!-- 最近订单 -->
          <div class="recent-orders">
            <h3>最近订单</h3>
            <div class="order-list">
              <div
                  v-for="order in recentOrders"
                  :key="order.id"
                  class="recent-order-item"
                  @click="viewOrder(order.id)"
              >
                <div class="order-header">
                  <span class="order-no">{{ order.order_no }}</span>
                  <el-tag :type="getOrderStatusType(order.status)" size="small">
                    {{ getOrderStatusText(order.status) }}
                  </el-tag>
                </div>
                <div class="order-info">
                  <span>{{ order.customer_name }}</span>
                  <span class="order-amount">¥{{ order.total_amount }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {computed, onMounted, ref} from 'vue'
import {ElMessage, ElMessageBox} from 'element-plus'
import {Search} from '@element-plus/icons-vue'
import {useRouter} from 'vue-router'
import {posApi} from '@/api/pos'

const router = useRouter()
const barcode = ref('')
const cartItems = ref([])
const orderFormRef = ref()
const submitting = ref(false)

// 订单表单数据
const orderForm = ref({
  order_type: 'dine_in',
  table_number: '',
  customer_name: '',
  customer_phone: '',
  payment_method: 'cash',
  remark: ''
})

// 验证规则
const rules = {
  customer_name: [
    {required: true, message: '请输入顾客姓名', trigger: 'blur'}
  ],
  customer_phone: [
    {
      required: true,
      pattern: /^1[3-9]\d{9}$/,
      message: '请输入正确的手机号码',
      trigger: 'blur'
    }
  ]
}

// 可用桌台（模拟数据）
const availableTables = ref([
  {id: 1, table_number: 'A01', table_name: '1 号桌'},
  {id: 2, table_number: 'A02', table_name: '2 号桌'},
  {id: 3, table_number: 'B01', table_name: '卡座 1'}
])

// 最近订单（模拟数据）
const recentOrders = ref([
  {
    id: 1,
    order_no: 'ORD202603240001',
    customer_name: '张三',
    total_amount: '128.00',
    status: 'completed'
  },
  {
    id: 2,
    order_no: 'ORD202603240002',
    customer_name: '李四',
    total_amount: '86.00',
    status: 'pending'
  }
])

// 计算属性
const totalQuantity = computed(() => {
  return cartItems.value.reduce((sum, item) => sum + item.quantity, 0)
})

const totalAmount = computed(() => {
  return cartItems.value.reduce((sum, item) => sum + item.price * item.quantity, 0)
})

const discountAmount = ref(0)
const deliveryFee = computed(() => {
  return orderForm.value.order_type === 'delivery' ? 5 : 0
})

const finalAmount = computed(() => {
  return totalAmount.value - discountAmount.value + deliveryFee.value
})

// 方法
const handleScanBarcode = async () => {
  if (!barcode.value.trim()) {
    ElMessage.warning('请输入商品条码')
    return
  }

  try {
    const response = await posApi.scanBarcode({barcode: barcode.value})

    if (response.data.type === 'product') {
      // 添加商品到购物车
      cartItems.value.push({
        name: response.data.data.name || `商品${barcode.value}`,
        price: parseFloat(response.data.data.price || 0),
        quantity: 1,
        image: response.data.data.image || '/images/product-placeholder.jpg',
        product_id: response.data.data.id
      })

      ElMessage.success('商品已添加')
    } else if (response.data.type === 'member') {
      // 会员卡信息
      ElMessageBox.alert(
          `会员姓名：${response.data.data.name}\n积分：${response.data.data.points}`,
          '会员信息'
      )
    }

    barcode.value = ''
  } catch (error) {
    console.error('扫描失败:', error)
    // 如果是 404，允许手动输入商品信息
    ElMessageBox.prompt('未找到对应商品，请手动输入商品信息', '手动录入', {
      inputPlaceholder: '商品名称，价格（用逗号分隔）',
      inputValue: '手动商品，0'
    }).then(({value}) => {
      const [name, price] = value.split(',')
      cartItems.value.push({
        name: name.trim(),
        price: parseFloat(price.trim()) || 0,
        quantity: 1
      })
      ElMessage.success('商品已添加')
    }).catch(() => {
    })
  }
}

const updateQuantity = (index, quantity) => {
  cartItems.value[index].quantity = quantity
}

const removeItem = (index) => {
  cartItems.value.splice(index, 1)
}

const handleApplyDiscount = () => {
  ElMessageBox.prompt('请输入折扣金额', '应用折扣', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputPattern: /^\d+(\.\d{1,2})?$/,
    inputErrorMessage: '请输入有效金额'
  }).then(({value}) => {
    discountAmount.value = parseFloat(value)
    ElMessage.success('折扣已应用')
  }).catch(() => {
  })
}

const handleClearCart = () => {
  ElMessageBox.confirm('确定要清空购物车吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    cartItems.value = []
    discountAmount.value = 0
    ElMessage.success('已清空')
  }).catch(() => {
  })
}

const handleSubmitOrder = async () => {
  try {
    // 验证表单
    await orderFormRef.value.validate()

    // 检查购物车
    if (cartItems.value.length === 0) {
      ElMessage.warning('购物车为空')
      return
    }

    submitting.value = true

    // 准备订单数据
    const orderData = {
      order_type: orderForm.value.order_type,
      customer_name: orderForm.value.customer_name,
      customer_phone: orderForm.value.customer_phone,
      payment_method: orderForm.value.payment_method,
      items: cartItems.value.map(item => ({
        product_id: item.product_id || 0,
        quantity: item.quantity,
        unit_price: item.price
      }))
    }

    if (orderForm.value.order_type === 'dine_in' && orderForm.value.table_number) {
      orderData.table_number = orderForm.value.table_number
    }

    // 调用快速下单 API
    const response = await posApi.quickOrder(orderData)

    ElMessage.success('订单创建成功！')

    // 清空表单和购物车
    cartItems.value = []
    discountAmount.value = 0
    orderForm.value.customer_name = ''
    orderForm.value.customer_phone = ''
    orderForm.value.remark = ''

    // 刷新最近订单
    await loadRecentOrders()

    // 询问是否打印
    ElMessageBox.confirm('是否需要打印订单？', '提示', {
      confirmButtonText: '打印',
      cancelButtonText: '稍后'
    }).then(() => {
      // TODO: 调用打印API
      ElMessage.info('打印功能开发中')
    }).catch(() => {
    })
  } catch (error) {
    if (error !== 'cancel') {
      console.error('创建订单失败:', error)
      ElMessage.error(error.response?.data?.message || '创建订单失败')
    }
  } finally {
    submitting.value = false
  }
}

const refreshRecentOrders = async () => {
  try {
    // TODO: 获取最近订单 API
    // const response = await orderApi.getOrders({ limit: 5 })
    // recentOrders.value = response.data.results || response.data
  } catch (error) {
    console.error('加载订单失败:', error)
  }
}

const viewOrder = (orderId) => {
  router.push(`/order/${orderId}`)
}

const loadAvailableTables = async () => {
  try {
    const response = await posApi.getAvailableTables()
    availableTables.value = response.data
  } catch (error) {
    console.error('加载桌台失败:', error)
  }
}

const getOrderStatusType = (status) => {
  const typeMap = {
    pending: 'warning',
    confirmed: 'primary',
    completed: 'success',
    cancelled: 'info'
  }
  return typeMap[status] || 'info'
}

const getOrderStatusText = (status) => {
  const textMap = {
    pending: '待确认',
    confirmed: '已确认',
    completed: '已完成',
    cancelled: '已取消'
  }
  return textMap[status] || status
}

onMounted(() => {
  loadAvailableTables()
  loadRecentOrders()
})
</script>

<style scoped>
.pos-checkout {
  min-height: 100vh;
  background: #f5f5f5;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  margin-bottom: 20px;
}

.header h1 {
  margin: 0 0 10px 0;
  color: #333;
}

.main-content {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
}

.left-panel,
.right-panel {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.barcode-section {
  margin-bottom: 20px;
}

.cart-section {
  margin-bottom: 20px;
  max-height: 400px;
  overflow-y: auto;
}

.section-title {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 15px;
  color: #333;
}

.empty-cart {
  padding: 40px 0;
}

.cart-items {
  .cart-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 0;
    border-bottom: 1px solid #f0f0f0;

    &:last-child {
      border-bottom: none;
    }

    .item-info {
      display: flex;
      align-items: center;
      flex: 1;

      .item-image {
        width: 60px;
        height: 60px;
        border-radius: 8px;
        margin-right: 15px;
        object-fit: cover;
      }

      .item-details {
        flex: 1;

        .item-name {
          font-weight: bold;
          margin-bottom: 5px;
        }

        .item-sku {
          font-size: 12px;
          color: #999;
          margin-bottom: 5px;
        }

        .item-price {
          color: #e4393c;
          font-weight: bold;
        }
      }
    }

    .item-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }
  }
}

.order-form {
  :deep(.el-form-item) {
    margin-bottom: 15px;
  }
}

.summary-card {
  h3 {
    margin: 0 0 20px 0;
    color: #333;
  }

  .summary-list {
    .summary-item {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;

      &.total {
        font-size: 18px;
        font-weight: bold;

        .total-amount {
          color: #e4393c;
          font-size: 24px;
        }
      }

      .amount {
        color: #333;
        font-weight: bold;

        &.discount {
          color: #67c23a;
        }
      }
    }
  }

  .quick-actions {
    display: flex;
    gap: 10px;
    margin: 20px 0;
  }
}

.recent-orders {
  margin-top: 30px;

  h3 {
    margin: 0 0 15px 0;
    color: #333;
  }

  .order-list {
    max-height: 300px;
    overflow-y: auto;

    .recent-order-item {
      padding: 15px;
      background: #f9f9f9;
      border-radius: 8px;
      margin-bottom: 10px;
      cursor: pointer;
      transition: all 0.3s;

      &:hover {
        background: #f0f0f0;
      }

      .order-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;

        .order-no {
          font-weight: bold;
        }
      }

      .order-info {
        display: flex;
        justify-content: space-between;
        font-size: 14px;
        color: #666;

        .order-amount {
          color: #e4393c;
          font-weight: bold;
        }
      }
    }
  }
}
</style>

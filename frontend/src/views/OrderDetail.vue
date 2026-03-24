<template>
  <div class="order-detail-page">
    <app-header :title="'订单详情'"/>

    <div class="container">
      <!-- 订单状态 -->
      <van-card
          :desc="'订单号：' + orderDetail.order_number"
          :thumb="orderStatusIcon"
          :title="getStatusText(orderDetail.status)"
          class="order-status-card"
      >
        <template #tags>
          <van-tag size="large" type="primary">{{ getStatusText(orderDetail.status) }}</van-tag>
        </template>
      </van-card>

      <!-- 配送信息 -->
      <van-cell-group v-if="orderDetail.delivery_info" class="section">
        <van-cell :value="getDeliveryTypeText(orderDetail.delivery_type)" title="配送方式"/>
        <van-cell
            v-if="orderDetail.delivery_address"
            :is-link="false"
            :value="formatAddress(orderDetail.delivery_address)"
            title="配送地址"
        />
        <van-cell
            v-if="orderDetail.customer_phone"
            :is-link="false"
            :value="orderDetail.customer_phone"
            title="联系电话"
        />
      </van-cell-group>

      <!-- 商品列表 -->
      <van-cell-group class="section">
        <van-cell title="商品信息"/>
        <div class="order-items">
          <div
              v-for="item in orderDetail.items"
              :key="item.id"
              class="order-item"
          >
            <van-image
                :height="60"
                :src="getImageUrl(item.product_image)"
                :width="60"
                class="item-image"
                fit="cover"
            />
            <div class="item-info">
              <div class="item-name">{{ item.product_name }}</div>
              <div v-if="item.sku_specifications" class="item-specs">
                {{ item.sku_specifications }}
              </div>
              <div class="item-meta">
                <span class="item-price">¥{{ formatPrice(item.unit_price) }}</span>
                <span class="item-quantity">x{{ item.quantity }}</span>
              </div>
            </div>
          </div>
        </div>
      </van-cell-group>

      <!-- 费用明细 -->
      <van-cell-group class="section">
        <van-cell title="订单金额"/>
        <div class="price-details">
          <div class="price-row">
            <span>商品总额</span>
            <span>¥{{ formatPrice(orderDetail.total_amount || 0) }}</span>
          </div>
          <div v-if="orderDetail.discount_amount" class="price-row">
            <span>优惠金额</span>
            <span class="discount">-¥{{ formatPrice(orderDetail.discount_amount) }}</span>
          </div>
          <div v-if="orderDetail.delivery_fee" class="price-row">
            <span>配送费</span>
            <span>¥{{ formatPrice(orderDetail.delivery_fee) }}</span>
          </div>
          <van-divider/>
          <div class="price-row total">
            <span>实付款</span>
            <span class="total-price">¥{{
                formatPrice(orderDetail.paid_amount || orderDetail.total_amount || 0)
              }}</span>
          </div>
        </div>
      </van-cell-group>

      <!-- 支付信息 -->
      <van-cell-group v-if="orderDetail.payment_status" class="section">
        <van-cell :value="getPaymentStatusText(orderDetail.payment_status)" title="支付状态"/>
        <van-cell
            v-if="orderDetail.paid_at"
            :is-link="false"
            :value="formatTime(orderDetail.paid_at)"
            title="支付时间"
        />
      </van-cell-group>

      <!-- 订单备注 -->
      <van-cell-group v-if="orderDetail.remarks" class="section">
        <van-cell :is-link="false" :value="orderDetail.remarks" title="订单备注"/>
      </van-cell-group>

      <!-- 时间信息 -->
      <van-cell-group class="section">
        <van-cell
            :is-link="false"
            :value="formatTime(orderDetail.created_at)"
            title="下单时间"
        />
        <van-cell
            v-if="orderDetail.completed_at"
            :is-link="false"
            :value="formatTime(orderDetail.completed_at)"
            title="完成时间"
        />
      </van-cell-group>

      <!-- 底部操作栏 -->
      <div v-if="showActionBar" class="action-bar">
        <van-button
            v-if="canCancel"
            plain
            type="default"
            @click="handleCancelOrder"
        >
          取消订单
        </van-button>
        <van-button
            v-if="canPay"
            plain
            type="primary"
            @click="handlePayOrder"
        >
          立即支付
        </van-button>
        <van-button
            v-if="canConfirmReceive"
            plain
            type="success"
            @click="handleConfirmReceive"
        >
          确认收货
        </van-button>
        <van-button
            type="primary"
            @click="handleContactShop"
        >
          联系商家
        </van-button>
      </div>
    </div>

    <van-dialog
        v-model:show="showCancelDialog"
        message="确定要取消该订单吗？"
        show-cancel-button
        title="取消订单"
        @confirm="confirmCancelOrder"
    />
  </div>
</template>

<script setup>
import {ref, computed, onMounted} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {showDialog, showToast, showSuccessToast} from 'vant'
import { orderApi } from '@/api/order'
import AppHeader from '@/components/AppHeader.vue'
import {getImageUrl, formatPrice} from '@/utils'

const route = useRoute()
const router = useRouter()
const orderDetail = ref({})
const loading = ref(false)
const showCancelDialog = ref(false)

// 计算属性
const orderStatusIcon = computed(() => {
  const statusMap = {
    pending: 'https://img.yzcdn.cn/public_files/2019/03/05/2b6c8e3a7d6f4e3e8f3e3e3e3e3e3e3e.png',
    confirmed: 'https://img.yzcdn.cn/public_files/2019/03/05/2b6c8e3a7d6f4e3e8f3e3e3e3e3e3e3e.png',
    preparing: 'https://img.yzcdn.cn/public_files/2019/03/05/2b6c8e3a7d6f4e3e8f3e3e3e3e3e3e3e.png',
    completed: 'https://img.yzcdn.cn/public_files/2019/03/05/2b6c8e3a7d6f4e3e8f3e3e3e3e3e3e3e.png',
    cancelled: 'https://img.yzcdn.cn/public_files/2019/03/05/2b6c8e3a7d6f4e3e8f3e3e3e3e3e3e3e.png'
  }
  return statusMap[orderDetail.value.status] || ''
})

const showActionBar = computed(() => {
  return ['pending', 'paid', 'confirmed', 'preparing'].includes(orderDetail.value.status)
})

const canCancel = computed(() => {
  return ['pending', 'paid'].includes(orderDetail.value.status)
})

const canPay = computed(() => {
  return orderDetail.value.status === 'pending' && orderDetail.value.payment_status === 'unpaid'
})

const canConfirmReceive = computed(() => {
  return ['preparing', 'delivered'].includes(orderDetail.value.status)
})

onMounted(() => {
  fetchOrderDetail()
})

const fetchOrderDetail = async () => {
  loading.value = true
  try {
    const response = await orderApi.getOrder(route.params.orderId)
    orderDetail.value = response.data
  } catch (error) {
    console.error('获取订单详情失败:', error)
    showToast('获取订单详情失败')
  } finally {
    loading.value = false
  }
}

const getStatusText = (status) => {
  const statusMap = {
    pending: '待确认',
    confirmed: '已确认',
    preparing: '制作中',
    completed: '已完成',
    cancelled: '已取消'
  }
  return statusMap[status] || status
}

const getDeliveryTypeText = (type) => {
  const typeMap = {
    delivery: '外卖配送',
    pickup: '到店自取',
    dine_in: '堂食'
  }
  return typeMap[type] || type
}

const getPaymentStatusText = (status) => {
  const statusMap = {
    unpaid: '未支付',
    paid: '已支付',
    refunded: '已退款'
  }
  return statusMap[status] || status
}

const formatTime = (timeString) => {
  if (!timeString) return ''
  return new Date(timeString).toLocaleString()
}

const formatAddress = (address) => {
  if (!address) return ''
  return `${address.province}${address.city}${address.district}${address.detail}`
}

const handleCancelOrder = () => {
  showCancelDialog.value = true
}

const confirmCancelOrder = async () => {
  try {
    await orderApi.cancelOrder(route.params.orderId, {
      notes: '用户主动取消'
    })
    showSuccessToast('订单已取消')
    fetchOrderDetail()
  } catch (error) {
    console.error('取消订单失败:', error)
    showToast('取消订单失败')
  }
}

const handlePayOrder = () => {
  // TODO: 跳转到支付页面或调用支付接口
  showToast('即将跳转支付')
}

const handleConfirmReceive = async () => {
  try {
    showDialog({
      title: '确认收货',
      message: '确认已经收到商品？',
      showCancelButton: true,
    }).then(async () => {
      // TODO: 调用确认收货 API
      showSuccessToast('确认收货成功')
      fetchOrderDetail()
    })
  } catch (error) {
    console.error('确认收货失败:', error)
  }
}

const handleContactShop = () => {
  // TODO: 联系商家功能
  showToast('联系商家功能开发中')
}
</script>

<style lang="scss" scoped>
@use '../styles/variables' as *;

.order-detail-page {
  min-height: 100vh;
  background: $background-color;
  padding-bottom: 60px;

  .container {
    padding: 10px;
  }

  .order-status-card {
    margin-bottom: 10px;

    :deep(.van-card__header) {
      padding-top: 15px;
    }
  }

  .section {
    margin-bottom: 10px;
    border-radius: $border-radius-lg;
    overflow: hidden;
  }

  .order-items {
    padding: 10px 15px;

    .order-item {
      display: flex;
      padding: 10px 0;
      border-bottom: 1px solid $border-color;

      &:last-child {
        border-bottom: none;
      }

      .item-image {
        width: 60px;
        height: 60px;
        border-radius: $border-radius;
        margin-right: 10px;
      }

      .item-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: space-between;

        .item-name {
          font-size: $font-size-md;
          color: $text-color;
          @include multi-line-ellipsis(1);
        }

        .item-specs {
          font-size: $font-size-sm;
          color: $text-color-light;
          @include multi-line-ellipsis(1);
        }

        .item-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;

          .item-price {
            font-size: $font-size-md;
            color: $danger-color;
            font-weight: bold;
          }

          .item-quantity {
            font-size: $font-size-sm;
            color: $text-color-light;
          }
        }
      }
    }
  }

  .price-details {
    padding: 10px 15px;

    .price-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      font-size: $font-size-md;

      &.total {
        font-weight: bold;

        .total-price {
          font-size: $font-size-lg;
          color: $danger-color;
        }
      }

      .discount {
        color: $danger-color;
      }
    }
  }

  .action-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    max-width: $page-max-width;
    margin: 0 auto;
    background: white;
    display: flex;
    align-items: center;
    padding: 10px 15px;
    border-top: 1px solid $border-color;
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
    gap: 10px;

    .van-button {
      flex: 1;
    }
  }
}
</style>
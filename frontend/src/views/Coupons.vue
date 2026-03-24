<template>
  <div class="coupons-page">
    <app-header :show-back="true" title="优惠券"/>

    <!-- 选项卡 -->
    <van-tabs v-model:active="activeTab" @change="onTabChange">
      <van-tab name="available" title="可使用">
        <div class="coupon-list">
          <div
              v-for="coupon in availableCoupons"
              :key="coupon.id"
              class="coupon-item"
          >
            <div :style="{ backgroundColor: coupon.color || '#e74c3c' }" class="coupon-left">
              <div class="amount">
                <span class="symbol">¥</span>
                <span class="value">{{ coupon.amount }}</span>
              </div>
              <div v-if="coupon.min_purchase" class="condition">
                满{{ coupon.min_purchase }}可用
              </div>
            </div>
            <div class="coupon-right">
              <div class="coupon-name">{{ coupon.name }}</div>
              <div class="coupon-desc">{{ coupon.description }}</div>
              <div class="coupon-validity">
                有效期至 {{ formatDate(coupon.valid_until) }}
              </div>
              <van-button
                  v-if="canUse(coupon)"
                  round
                  size="small"
                  type="primary"
                  @click="useCoupon(coupon)"
              >
                立即使用
              </van-button>
            </div>
          </div>

          <van-empty
              v-if="availableCoupons.length === 0"
              description="暂无可用优惠券"
              image="coupon-o"
          />
        </div>
      </van-tab>

      <van-tab name="used" title="已使用">
        <div class="coupon-list">
          <div
              v-for="coupon in usedCoupons"
              :key="coupon.id"
              class="coupon-item used"
          >
            <div class="coupon-left used">
              <div class="amount">
                <span class="symbol">¥</span>
                <span class="value">{{ coupon.amount }}</span>
              </div>
              <div v-if="coupon.min_purchase" class="condition">
                满{{ coupon.min_purchase }}可用
              </div>
            </div>
            <div class="coupon-right">
              <div class="coupon-name">{{ coupon.name }}</div>
              <div class="coupon-desc">{{ coupon.description }}</div>
              <div class="coupon-validity">
                已使用于 {{ formatDate(coupon.used_at) }}
              </div>
            </div>
          </div>

          <van-empty
              v-if="usedCoupons.length === 0"
              description="暂无使用记录"
              image="coupon-o"
          />
        </div>
      </van-tab>

      <van-tab name="expired" title="已过期">
        <div class="coupon-list">
          <div
              v-for="coupon in expiredCoupons"
              :key="coupon.id"
              class="coupon-item expired"
          >
            <div class="coupon-left expired">
              <div class="amount">
                <span class="symbol">¥</span>
                <span class="value">{{ coupon.amount }}</span>
              </div>
              <div v-if="coupon.min_purchase" class="condition">
                满{{ coupon.min_purchase }}可用
              </div>
            </div>
            <div class="coupon-right">
              <div class="coupon-name">{{ coupon.name }}</div>
              <div class="coupon-desc">{{ coupon.description }}</div>
              <div class="coupon-validity">
                已过期 {{ formatDate(coupon.valid_until) }}
              </div>
            </div>
          </div>

          <van-empty
              v-if="expiredCoupons.length === 0"
              description="暂无过期优惠券"
              image="coupon-o"
          />
        </div>
      </van-tab>
    </van-tabs>
  </div>
</template>

<script setup>
import {ref, onMounted} from 'vue'
import {useRouter} from 'vue-router'
import {showToast} from 'vant'
import AppHeader from '../components/AppHeader.vue'

const router = useRouter()
const activeTab = ref('available')
const loading = ref(false)

const availableCoupons = ref([])
const usedCoupons = ref([])
const expiredCoupons = ref([])

// 模拟数据（实际应该从 API 获取）
const mockCoupons = [
  {
    id: 1,
    name: '新人专享券',
    description: '全场通用',
    amount: 10,
    min_purchase: 50,
    valid_until: '2026-12-31',
    status: 'available',
    color: '#e74c3c'
  },
  {
    id: 2,
    name: '满减优惠券',
    description: '部分商品可用',
    amount: 20,
    min_purchase: 100,
    valid_until: '2026-06-30',
    used_at: '2026-03-15',
    status: 'used',
    color: '#3498db'
  },
  {
    id: 3,
    name: '折扣券',
    description: '限时特惠',
    amount: 5,
    min_purchase: 30,
    valid_until: '2026-02-28',
    status: 'expired',
    color: '#95a5a6'
  }
]

onMounted(() => {
  loadCoupons()
})

const loadCoupons = async () => {
  // TODO: 从 API 加载优惠券数据
  const coupons = mockCoupons
  availableCoupons.value = coupons.filter(c => c.status === 'available')
  usedCoupons.value = coupons.filter(c => c.status === 'used')
  expiredCoupons.value = coupons.filter(c => c.status === 'expired')
}

const onTabChange = (name) => {
  activeTab.value = name
}

const canUse = (coupon) => {
  const now = new Date()
  const validUntil = new Date(coupon.valid_until)
  return validUntil > now
}

const useCoupon = (coupon) => {
  // TODO: 使用优惠券逻辑
  showToast(`使用优惠券：${coupon.name}`)
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
</script>

<style lang="scss" scoped>
@use '../styles/variables' as *;

.coupons-page {
  min-height: 100vh;
  background: $background-color;

  .coupon-list {
    padding: 10px;

    .coupon-item {
      display: flex;
      margin-bottom: 10px;
      border-radius: $border-radius-lg;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

      .coupon-left {
        width: 100px;
        padding: 15px 10px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: white;

        .amount {
          display: flex;
          align-items: baseline;

          .symbol {
            font-size: 14px;
            margin-right: 2px;
          }

          .value {
            font-size: 28px;
            font-weight: bold;
          }
        }

        .condition {
          font-size: 12px;
          margin-top: 5px;
          opacity: 0.9;
        }

        &.used,
        &.expired {
          background: #bdc3c7 !important;
        }
      }

      .coupon-right {
        flex: 1;
        padding: 15px;
        background: white;
        display: flex;
        flex-direction: column;
        justify-content: space-between;

        .coupon-name {
          font-size: $font-size-md;
          font-weight: bold;
          color: $text-color;
          margin-bottom: 4px;
        }

        .coupon-desc {
          font-size: $font-size-sm;
          color: $text-color-light;
          margin-bottom: 8px;
        }

        .coupon-validity {
          font-size: $font-size-xs;
          color: $text-color-light;
          margin-bottom: 8px;
        }
      }

      &.used,
      &.expired {
        opacity: 0.7;
      }
    }
  }
}
</style>

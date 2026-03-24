<template>
  <div class="points-page">
    <app-header :show-back="true" title="积分中心"/>

    <!-- 积分概览 -->
    <div class="points-overview">
      <div class="total-points">
        <div class="label">我的积分</div>
        <div class="value">{{ membershipInfo?.available_points || 0 }}</div>
      </div>
      <div v-if="membershipInfo" class="level-info">
        <van-tag size="large" type="primary">{{ membershipInfo.level_name }}</van-tag>
        <div v-if="membershipInfo.next_level_name" class="next-level">
          再得 {{ membershipInfo.next_level_points - membershipInfo.available_points }}
          积分升级至{{ membershipInfo.next_level_name }}
        </div>
      </div>
    </div>

    <!-- 功能入口 -->
    <van-grid :border="false" :column-num="3" class="action-grid">
      <van-grid-item icon="gift-o" text="签到赚分" @click="handleSignin"/>
      <van-grid-item icon="shopping-cart-o" text="积分兑换" @click="goToExchange"/>
      <van-grid-item icon="records" text="积分任务" @click="showTasks"/>
    </van-grid>

    <!-- 积分明细 -->
    <div class="points-history">
      <div class="section-header">
        <h3>积分明细</h3>
        <van-button plain size="small" type="primary" @click="loadHistory">
          刷新
        </van-button>
      </div>

      <van-cell-group>
        <van-cell
            v-for="log in pointsLogs"
            :key="log.id"
            :label="formatTime(log.created_at)"
            :title="log.points_type_text"
        >
          <template #right-icon>
            <span :class="['points-change', log.change_type === 'earn' ? 'positive' : 'negative']">
              {{ log.change_type === 'earn' ? '+' : '-' }}{{ log.points }}
            </span>
          </template>
        </van-cell>
      </van-cell-group>

      <van-empty
          v-if="pointsLogs.length === 0"
          description="暂无积分记录"
          image="records"
      />
    </div>

    <!-- 积分规则说明 -->
    <div class="rules-section">
      <div class="section-header">
        <h3>积分规则</h3>
      </div>
      <van-collapse v-model="activeRules">
        <van-collapse-item name="1" title="如何获得积分">
          <div class="rule-content">
            <p>• 每日签到：+10 积分</p>
            <p>• 消费 1 元 = 1 积分</p>
            <p>• 完善个人信息：+50 积分</p>
            <p>• 邀请好友：+100 积分/人</p>
          </div>
        </van-collapse-item>
        <van-collapse-item name="2" title="如何使用积分">
          <div class="rule-content">
            <p>• 积分兑换商品</p>
            <p>• 积分抵扣现金（100 积分=1 元）</p>
            <p>• 参与积分抽奖活动</p>
          </div>
        </van-collapse-item>
        <van-collapse-item name="3" title="积分有效期">
          <div class="rule-content">
            <p>• 积分自获得之日起有效期为一年</p>
            <p>• 过期积分将自动清零</p>
            <p>• 会员等级越高，积分有效期越长</p>
          </div>
        </van-collapse-item>
      </van-collapse>
    </div>
  </div>
</template>

<script setup>
import {ref, onMounted} from 'vue'
import {useRouter} from 'vue-router'
import {showToast, showSuccessToast, showDialog} from 'vant'
import {userApi} from '../api/user'
import AppHeader from '../components/AppHeader.vue'

const router = useRouter()
const loading = ref(false)
const activeRules = ref(['1'])

const membershipInfo = ref(null)
const pointsLogs = ref([])

// 模拟积分记录
const mockPointsLogs = [
  {
    id: 1,
    points_type_text: '每日签到',
    change_type: 'earn',
    points: 10,
    created_at: '2026-03-24 09:00:00'
  },
  {
    id: 2,
    points_type_text: '订单消费',
    change_type: 'earn',
    points: 58,
    created_at: '2026-03-23 18:30:00'
  },
  {
    id: 3,
    points_type_text: '积分兑换',
    change_type: 'consume',
    points: 100,
    created_at: '2026-03-22 14:20:00'
  }
]

onMounted(async () => {
  await loadMembershipInfo()
  await loadHistory()
})

const loadMembershipInfo = async () => {
  try {
    const response = await userApi.getMembershipInfo()
    membershipInfo.value = response.data
  } catch (error) {
    console.error('加载会员信息失败:', error)
  }
}

const loadHistory = async () => {
  // TODO: 从 API 加载积分记录
  pointsLogs.value = mockPointsLogs
}

const handleSignin = async () => {
  try {
    const response = await userApi.signin()
    showSuccessToast(`签到成功！获得${response.data.points_earned}积分`)
    await loadMembershipInfo()
    await loadHistory()
  } catch (error) {
    if (error.response?.data?.error) {
      showToast(error.response.data.error)
    } else {
      showToast('签到失败')
    }
  }
}

const goToExchange = () => {
  router.push('/products?tab=exchange')
}

const showTasks = () => {
  showDialog({
    title: '积分任务',
    message: '积分任务功能开发中...',
  })
}

const formatTime = (timeString) => {
  if (!timeString) return ''
  return new Date(timeString).toLocaleString()
}
</script>

<style lang="scss" scoped>
@use '../styles/variables' as *;

.points-page {
  min-height: 100vh;
  background: $background-color;

  .points-overview {
    background: linear-gradient(135deg, #ffd21e, #ff976a);
    padding: 30px 20px;
    color: white;

    .total-points {
      text-align: center;
      margin-bottom: 20px;

      .label {
        font-size: $font-size-md;
        opacity: 0.9;
        margin-bottom: 10px;
      }

      .value {
        font-size: 48px;
        font-weight: bold;
      }
    }

    .level-info {
      text-align: center;

      .next-level {
        margin-top: 10px;
        font-size: $font-size-sm;
        opacity: 0.9;
      }
    }
  }

  .action-grid {
    margin: 10px;
    background: white;
    border-radius: $border-radius-lg;
    overflow: hidden;
  }

  .points-history {
    background: white;
    padding: 15px;
    margin: 10px;
    border-radius: $border-radius-lg;

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;

      h3 {
        margin: 0;
        font-size: $font-size-lg;
        color: $text-color;
      }
    }

    .points-change {
      font-weight: bold;

      &.positive {
        color: $success-color;
      }

      &.negative {
        color: $danger-color;
      }
    }
  }

  .rules-section {
    background: white;
    margin: 10px;
    border-radius: $border-radius-lg;
    padding: 15px;

    .section-header {
      margin-bottom: 15px;

      h3 {
        margin: 0;
        font-size: $font-size-lg;
        color: $text-color;
      }
    }

    .rule-content {
      p {
        margin: 8px 0;
        font-size: $font-size-sm;
        color: $text-color-light;
        line-height: 1.6;
      }
    }
  }
}
</style>

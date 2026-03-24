<template>
  <div class="profile-page">
    <app-header :show-back="false" title="个人中心"/>

    <!-- 用户信息头部 -->
    <div class="user-header">
      <van-image
          :src="userInfo.avatar || defaultAvatar"
          class="avatar"
          fit="cover"
          round
      />
      <div class="user-info">
        <div class="username">{{ userInfo.username || '未登录' }}</div>
        <div v-if="userInfo.phone" class="phone">{{ formatPhone(userInfo.phone) }}</div>
      </div>
    </div>

    <!-- 会员信息卡片 -->
    <div v-if="userStore.isLoggedIn && membershipInfo" class="membership-card">
      <div class="membership-header">
        <div class="level-badge">{{ membershipInfo.level_name }}</div>
        <div class="points">可用积分：{{ membershipInfo.available_points }}</div>
      </div>
      <div class="membership-progress">
        <van-progress
            :percentage="pointsProgress"
            color="#ffd21e"
        />
        <div class="progress-text">再得 {{ nextLevelPoints - membershipInfo.available_points }} 积分升级</div>
      </div>
    </div>

    <!-- 订单入口 -->
    <van-cell-group class="section">
      <van-cell is-link title="我的订单" @click="$router.push('/orders')">
        <template #icon>
          <van-icon color="#1989fa" name="orders-o" size="20"/>
        </template>
      </van-cell>
      <van-cell :value="orderStats.pending" is-link title="待支付" @click="goToOrders('pending')"/>
      <van-cell :value="orderStats.preparing" is-link title="制作中" @click="goToOrders('preparing')"/>
      <van-cell :value="orderStats.completed" is-link title="待评价" @click="goToOrders('completed')"/>
    </van-cell-group>

    <!-- 资产相关 -->
    <van-cell-group class="section">
      <van-cell is-link title="优惠券" @click="$router.push('/coupons')">
        <template #icon>
          <van-icon color="#ff976a" name="coupon-o" size="20"/>
        </template>
        <template #right-icon>
          <van-tag size="mini" type="primary">{{ couponCount }}张</van-tag>
        </template>
      </van-cell>
      <van-cell is-link title="积分中心" @click="$router.push('/points')">
        <template #icon>
          <van-icon color="#ee0a24" name="gift-o" size="20"/>
        </template>
      </van-cell>
      <van-cell is-link title="我的收藏" @click="$router.push('/favorites')">
        <template #icon>
          <van-icon color="#ffd21e" name="star-o" size="20"/>
        </template>
      </van-cell>
    </van-cell-group>

    <!-- 地址管理 -->
    <van-cell-group class="section">
      <van-cell is-link title="收货地址" @click="$router.push('/address')">
        <template #icon>
          <van-icon color="#07c160" name="location-o" size="20"/>
        </template>
      </van-cell>
    </van-cell-group>

    <!-- 客服与帮助 -->
    <van-cell-group class="section">
      <van-cell is-link title="联系客服" @click="handleContact">
        <template #icon>
          <van-icon color="#1989fa" name="service-o" size="20"/>
        </template>
      </van-cell>
      <van-cell is-link title="帮助中心" @click="$router.push('/help')">
        <template #icon>
          <van-icon color="#ff976a" name="question-o" size="20"/>
        </template>
      </van-cell>
      <van-cell is-link title="关于我们" @click="handleAbout">
        <template #icon>
          <van-icon color="#576b95" name="info-o" size="20"/>
        </template>
      </van-cell>
    </van-cell-group>

    <!-- 签到按钮 -->
    <div v-if="userStore.isLoggedIn" class="signin-section">
      <van-button
          :loading="signinLoading"
          block
          round
          type="primary"
          @click="handleSignin"
      >
        每日签到
      </van-button>
    </div>

    <!-- 退出登录 -->
    <div v-if="userStore.isLoggedIn" class="logout-section">
      <van-button
          block
          plain
          round
          type="danger"
          @click="handleLogout"
      >
        退出登录
      </van-button>
    </div>

    <!-- 底部占位 -->
    <div style="height: 30px;"></div>
  </div>
</template>

<script setup>
import {ref, computed, onMounted} from 'vue'
import {useRouter} from 'vue-router'
import {showDialog, showSuccessToast, showToast} from 'vant'
import {useUserStore} from '../stores/user'
import {userApi} from '../api/user'
import AppHeader from '../components/AppHeader.vue'

const router = useRouter()
const userStore = useUserStore()

const defaultAvatar = 'https://img.yzcdn.cn/vant/user-active.png'
const signinLoading = ref(false)

const userInfo = computed(() => userStore.userInfo || {})
const membershipInfo = ref(null)
const orderStats = ref({
  pending: 0,
  preparing: 0,
  completed: 0
})
const couponCount = ref(0)

const pointsProgress = computed(() => {
  if (!membershipInfo.value) return 0
  const nextLevelPoints = membershipInfo.value.next_level_points || 1000
  return Math.min((membershipInfo.value.available_points / nextLevelPoints) * 100, 100)
})

const nextLevelPoints = computed(() => {
  return membershipInfo.value?.next_level_points || 1000
})

onMounted(async () => {
  if (userStore.isLoggedIn) {
    await loadMembershipInfo()
    await loadOrderStats()
  }
})

const loadMembershipInfo = async () => {
  try {
    const response = await userApi.getMembershipInfo()
    membershipInfo.value = response.data
  } catch (error) {
    console.error('加载会员信息失败:', error)
    // 不显示错误提示，允许用户继续使用基本功能
  }
}

const loadOrderStats = async () => {
  try {
    const response = await userApi.getOrders()
    const orders = response.data.results || response.data
    orderStats.value.pending = orders.filter(o => o.status === 'pending').length
    orderStats.value.preparing = orders.filter(o => o.status === 'preparing').length
    orderStats.value.completed = orders.filter(o => o.status === 'completed').length
  } catch (error) {
    console.error('加载订单统计失败:', error)
    // 不显示错误提示，允许用户继续使用基本功能
  }
}

const formatPhone = (phone) => {
  if (!phone) return ''
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

const goToOrders = (status) => {
  router.push({path: '/orders', query: {status}})
}

const handleSignin = async () => {
  signinLoading.value = true
  try {
    const response = await userApi.signin()
    showSuccessToast(`签到成功！获得${response.data.points_earned}积分`)
    await loadMembershipInfo()
  } catch (error) {
    if (error.response?.data?.error) {
      showToast(error.response.data.error)
    } else {
      showToast('签到失败')
    }
  } finally {
    signinLoading.value = false
  }
}

const handleLogout = () => {
  showDialog({
    title: '确认退出',
    message: '确定要退出登录吗？',
    showCancelButton: true,
  }).then(async () => {
    await userStore.logout()
    showSuccessToast('已退出登录')
    router.push('/home')
  })
}

const handleContact = () => {
  showToast('客服功能开发中')
}

const handleAbout = () => {
  showDialog({
    title: '关于 Zdrink',
    message: 'Zdrink 智慧餐饮系统\n版本：v1.0.0\n\n提供便捷的在线点餐服务',
  })
}
</script>

<style lang="scss" scoped>
@use '../styles/variables' as *;

.profile-page {
  min-height: 100vh;
  background: $background-color;

  .user-header {
    background: linear-gradient(135deg, #1989fa, #0081ff);
    padding: 30px 20px;
    display: flex;
    align-items: center;

    .avatar {
      width: 70px;
      height: 70px;
      border: 3px solid white;
      margin-right: 15px;
    }

    .user-info {
      flex: 1;

      .username {
        font-size: $font-size-lg;
        color: white;
        font-weight: bold;
        margin-bottom: 5px;
      }

      .phone {
        font-size: $font-size-sm;
        color: rgba(255, 255, 255, 0.8);
      }
    }
  }

  .membership-card {
    margin: 10px;
    background: linear-gradient(135deg, #fff8e6, #ffffff);
    border-radius: $border-radius-lg;
    padding: 15px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

    .membership-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;

      .level-badge {
        background: linear-gradient(135deg, #ffd21e, #ff976a);
        color: white;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: $font-size-sm;
        font-weight: bold;
      }

      .points {
        font-size: $font-size-md;
        color: #ff976a;
        font-weight: bold;
      }
    }

    .membership-progress {
      .progress-text {
        text-align: center;
        font-size: $font-size-xs;
        color: $text-color-light;
        margin-top: 5px;
      }
    }
  }

  .section {
    margin: 10px;
    border-radius: $border-radius-lg;
    overflow: hidden;
  }

  .signin-section {
    margin: 20px 10px;

    .van-button {
      height: 44px;
    }
  }

  .logout-section {
    margin: 0 10px 20px 10px;
  }
}
</style>

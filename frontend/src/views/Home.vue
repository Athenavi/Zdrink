<template>
  <div class="home-page">
    <app-header title="Zdrink点餐" :show-back="false" :show-cart="true" />

    <!-- 搜索栏 -->
    <div class="search-section">
      <van-search
        v-model="searchKeyword"
        placeholder="搜索店铺或商品"
        shape="round"
        @search="handleSearch"
      />
    </div>

    <!-- 轮播图 -->
    <div class="banner-section" v-if="banners.length > 0">
      <van-swipe :autoplay="3000" indicator-color="white">
        <van-swipe-item v-for="banner in banners" :key="banner.id">
          <van-image :src="banner.image" fit="cover" />
        </van-swipe-item>
      </van-swipe>
    </div>

    <!-- 功能入口 -->
    <div class="feature-section">
      <van-grid :column-num="4" :border="false">
        <van-grid-item
          v-for="feature in features"
          :key="feature.id"
          :icon="feature.icon"
          :text="feature.text"
          @click="handleFeatureClick(feature)"
        />
      </van-grid>
    </div>

    <!-- 推荐店铺 -->
    <div class="shop-section">
      <div class="section-header">
        <h2 class="section-title">推荐店铺</h2>
        <van-button type="primary" size="mini" text="查看更多" @click="goToShopList" />
      </div>

      <div class="shop-list">
        <div
          v-for="shop in featuredShops"
          :key="shop.id"
          class="shop-item"
          @click="goToShop(shop.id)"
        >
          <van-image
            :src="getImageUrl(shop.logo)"
            class="shop-logo"
            fit="cover"
          />
          <div class="shop-info">
            <h3 class="shop-name">{{ shop.name }}</h3>
            <p class="shop-desc">{{ shop.description }}</p>
            <div class="shop-meta">
              <span class="shop-type">{{ getShopTypeText(shop.shop_type) }}</span>
              <span class="shop-status" :class="shop.is_active ? 'open' : 'closed'">
                {{ shop.is_active ? '营业中' : '已打烊' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部导航 -->
    <van-tabbar v-model="activeTab" @change="handleTabChange">
      <van-tabbar-item icon="home-o" name="home">首页</van-tabbar-item>
      <van-tabbar-item icon="apps-o" name="category">分类</van-tabbar-item>
      <van-tabbar-item icon="shopping-cart-o" name="cart" :badge="cartStore.totalQuantity">
        购物车
      </van-tabbar-item>
      <van-tabbar-item icon="user-o" name="profile">我的</van-tabbar-item>
    </van-tabbar>

    <loading :loading="loading" text="加载中..." />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '../stores/cart'
import { shopApi } from '../api/shop'
import AppHeader from '../components/AppHeader.vue'
import Loading from '../components/Loading.vue'
import { getImageUrl } from '../utils'

const router = useRouter()
const cartStore = useCartStore()

const activeTab = ref('home')
const searchKeyword = ref('')
const loading = ref(false)
const banners = ref([])
const featuredShops = ref([])

// 功能入口
const features = ref([
  { id: 1, icon: 'shop-o', text: '附近店铺', path: '/shops' },
  { id: 2, icon: 'coupon-o', text: '优惠券', path: '/coupons' },
  { id: 3, icon: 'gift-o', text: '积分兑换', path: '/points' },
  { id: 4, icon: 'question-o', text: '使用帮助', path: '/help' }
])

onMounted(async () => {
  await loadData()
  await cartStore.getCart()
})

const loadData = async () => {
  loading.value = true
  try {
    // 加载推荐店铺
    const shopResponse = await shopApi.getShops({ is_active: true, limit: 6 })
    featuredShops.value = shopResponse.data.results || shopResponse.data

    // 模拟轮播图数据
    banners.value = [
      { id: 1, image: '/images/banner1.jpg', link: '/promotion/1' },
      { id: 2, image: '/images/banner2.jpg', link: '/promotion/2' },
      { id: 3, image: '/images/banner3.jpg', link: '/promotion/3' }
    ]
  } catch (error) {
    console.error('加载数据失败:', error)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  if (searchKeyword.value.trim()) {
    router.push(`/search?q=${encodeURIComponent(searchKeyword.value)}`)
  }
}

const handleFeatureClick = (feature) => {
  router.push(feature.path)
}

const handleTabChange = (name) => {
  const routes = {
    home: '/home',
    category: '/categories',
    cart: '/cart',
    profile: '/profile'
  }
  router.push(routes[name])
}

const goToShopList = () => {
  router.push('/shops')
}

const goToShop = (shopId) => {
  router.push(`/shop/${shopId}`)
}

const getShopTypeText = (type) => {
  const typeMap = {
    restaurant: '餐厅',
    cafe: '咖啡厅',
    bar: '酒吧',
    bakery: '烘焙店',
    other: '其他'
  }
  return typeMap[type] || '店铺'
}
</script>

<style scoped lang="scss">
.home-page {
  padding-bottom: 50px;

  .search-section {
    padding: 10px;
    background: white;
  }

  .banner-section {
    margin: 10px;
    border-radius: $border-radius-lg;
    overflow: hidden;

    .van-swipe {
      height: 120px;
    }
  }

  .feature-section {
    margin: 10px;
    background: white;
    border-radius: $border-radius-lg;

    :deep(.van-grid-item__content) {
      padding: 15px 8px;
    }
  }

  .shop-section {
    margin: 10px;
    background: white;
    border-radius: $border-radius-lg;
    padding: 15px;

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;

      .section-title {
        margin: 0;
        font-size: $font-size-lg;
        font-weight: bold;
      }
    }

    .shop-list {
      .shop-item {
        display: flex;
        padding: 12px 0;
        border-bottom: 1px solid $border-color;

        &:last-child {
          border-bottom: none;
        }

        .shop-logo {
          width: 60px;
          height: 60px;
          border-radius: $border-radius;
          margin-right: 12px;
        }

        .shop-info {
          flex: 1;

          .shop-name {
            margin: 0 0 4px 0;
            font-size: $font-size-md;
            font-weight: bold;
          }

          .shop-desc {
            margin: 0 0 6px 0;
            font-size: $font-size-sm;
            color: $text-color-light;
            @include multi-line-ellipsis(1);
          }

          .shop-meta {
            display: flex;
            align-items: center;

            .shop-type {
              font-size: $font-size-xs;
              color: $text-color-light;
              margin-right: 8px;
            }

            .shop-status {
              font-size: $font-size-xs;
              padding: 2px 6px;
              border-radius: $border-radius;

              &.open {
                background: lighten($success-color, 40%);
                color: $success-color;
              }

              &.closed {
                background: lighten($text-color-light, 40%);
                color: $text-color-light;
              }
            }
          }
        }
      }
    }
  }
}
</style>
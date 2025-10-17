<template>
  <div class="shop-page">
    <app-header :title="shopInfo.name" :show-cart="true" />

    <!-- 店铺头部信息 -->
    <div class="shop-header">
      <van-image
        :src="getImageUrl(shopInfo.banner)"
        class="shop-banner"
        fit="cover"
      >
        <template v-slot:error>
          <div class="banner-error">
            <van-icon name="photo-fail" size="48" />
            <p>店铺横幅</p>
          </div>
        </template>
      </van-image>

      <div class="shop-info">
        <div class="shop-main-info">
          <van-image
            :src="getImageUrl(shopInfo.logo)"
            class="shop-logo"
            fit="cover"
          />
          <div class="shop-details">
            <h2 class="shop-name">{{ shopInfo.name }}</h2>
            <p class="shop-description">{{ shopInfo.description }}</p>
            <div class="shop-meta">
              <van-rate
                v-model="shopInfo.rating"
                readonly
                allow-half
                size="14"
                color="#ffd21e"
              />
              <span class="rating-text">{{ shopInfo.rating || 5.0 }}</span>
            </div>
          </div>
        </div>

        <div class="shop-features">
          <div class="feature-item">
            <van-icon name="clock-o" />
            <span>营业中</span>
          </div>
          <div class="feature-item">
            <van-icon name="location-o" />
            <span>{{ shopInfo.delivery_radius || 5 }}km</span>
          </div>
          <div class="feature-item">
            <van-icon name="balance-o" />
            <span>起送¥{{ shopInfo.minimum_order_amount || 0 }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 服务类型 -->
    <div class="service-types">
      <van-grid :column-num="3" :border="false">
        <van-grid-item
          v-if="shopInfo.allow_delivery"
          text="外卖"
          icon="logistics"
          @click="handleServiceType('delivery')"
        />
        <van-grid-item
          v-if="shopInfo.allow_pickup"
          text="自取"
          icon="shop-o"
          @click="handleServiceType('takeaway')"
        />
        <van-grid-item
          v-if="shopInfo.allow_dine_in"
          text="堂食"
          icon="friends-o"
          @click="handleServiceType('dine_in')"
        />
      </van-grid>
    </div>

    <!-- 推荐商品 -->
    <div class="featured-products" v-if="featuredProducts.length > 0">
      <div class="section-header">
        <h3 class="section-title">推荐商品</h3>
      </div>
      <div class="products-scroll">
        <product-card
          v-for="product in featuredProducts"
          :key="product.id"
          :product="product"
          :show-add-button="true"
          @click="goToProduct(product.id)"
          @add-to-cart="handleAddToCart"
        />
      </div>
    </div>

    <!-- 店铺公告 -->
    <div class="shop-notice" v-if="shopInfo.notice">
      <van-notice-bar
        :text="shopInfo.notice"
        left-icon="volume-o"
        background="#fef7ec"
        color="#ed6a0c"
      />
    </div>

    <!-- 行动按钮 -->
    <div class="action-buttons">
      <van-button
        type="primary"
        round
        block
        size="large"
        @click="goToMenu"
      >
        进入店铺点餐
      </van-button>
    </div>

    <loading :loading="loading" text="加载中..." />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showSuccessToast } from 'vant'
import { useCartStore } from '../stores/cart'
import { shopApi } from '../api/shop'
import { productApi } from '../api/product'
import AppHeader from '../components/AppHeader.vue'
import ProductCard from '../components/ProductCard.vue'
import Loading from '../components/Loading.vue'
import { getImageUrl } from '../utils'

const route = useRoute()
const router = useRouter()
const cartStore = useCartStore()

const shopId = ref(route.params.shopId)
const loading = ref(false)
const shopInfo = ref({})
const featuredProducts = ref([])

onMounted(async () => {
  await loadShopInfo()
  await loadFeaturedProducts()
})

const loadShopInfo = async () => {
  loading.value = true
  try {
    const response = await shopApi.getShop(shopId.value)
    shopInfo.value = response.data
  } catch (error) {
    console.error('加载店铺信息失败:', error)
  } finally {
    loading.value = false
  }
}

const loadFeaturedProducts = async () => {
  try {
    const response = await productApi.getPublicProducts(shopId.value, {
      is_featured: true,
      status: 'active',
      limit: 6
    })
    featuredProducts.value = response.data.results || response.data
  } catch (error) {
    console.error('加载推荐商品失败:', error)
  }
}

const handleServiceType = (type) => {
  // 这里可以处理不同服务类型的逻辑
  console.log('选择服务类型:', type)
}

const goToMenu = () => {
  router.push(`/menu/${shopId.value}`)
}

const goToProduct = (productId) => {
  router.push(`/product/${productId}`)
}

const handleAddToCart = async (product) => {
  try {
    await cartStore.addToCart({
      product_id: product.id,
      quantity: 1
    })
    showSuccessToast('已添加到购物车')
  } catch (error) {
    console.error('添加到购物车失败:', error)
  }
}
</script>

<style scoped lang="scss">
@use '../styles/variables' as *;
@use "sass:color";
.shop-page {
  padding-bottom: 20px;

  .shop-header {
    background: white;

    .shop-banner {
      width: 100%;
      height: 150px;

      .banner-error {
        @include flex-center;
        height: 100%;
        background: $background-color;
        color: $text-color-light;
        flex-direction: column;

        p {
          margin: 8px 0 0 0;
          font-size: $font-size-sm;
        }
      }
    }

    .shop-info {
      padding: 15px;

      .shop-main-info {
        display: flex;
        margin-bottom: 15px;

        .shop-logo {
          width: 60px;
          height: 60px;
          border-radius: $border-radius;
          margin-right: 12px;
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .shop-details {
          flex: 1;

          .shop-name {
            margin: 0 0 6px 0;
            font-size: $font-size-lg;
            font-weight: bold;
          }

          .shop-description {
            margin: 0 0 8px 0;
            font-size: $font-size-sm;
            color: $text-color-light;
            @include multi-line-ellipsis(2);
          }

          .shop-meta {
            display: flex;
            align-items: center;

            .rating-text {
              margin-left: 6px;
              font-size: $font-size-sm;
              color: $warning-color;
            }
          }
        }
      }

      .shop-features {
        display: flex;
        justify-content: space-around;
        padding: 10px 0;
        border-top: 1px solid $border-color;

        .feature-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          font-size: $font-size-sm;
          color: $text-color-light;

          .van-icon {
            font-size: 16px;
            margin-bottom: 4px;
            color: $primary-color;
          }
        }
      }
    }
  }

  .service-types {
    margin: 10px;
    background: white;
    border-radius: $border-radius-lg;

    :deep(.van-grid-item__content) {
      padding: 15px 8px;
    }
  }

  .featured-products {
    margin: 10px;
    background: white;
    border-radius: $border-radius-lg;
    padding: 15px;

    .section-header {
      margin-bottom: 15px;

      .section-title {
        margin: 0;
        font-size: $font-size-lg;
        font-weight: bold;
      }
    }

    .products-scroll {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }
  }

  .shop-notice {
    margin: 10px;
  }

  .action-buttons {
    margin: 20px 10px 10px 10px;
  }
}
</style>
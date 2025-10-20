<template>
  <div class="menu-page">
    <app-header :show-cart="true" :title="shopInfo.name"/>

    <div class="menu-container">
      <!-- 侧边分类导航 -->
      <div class="category-sidebar">
        <van-sidebar v-model="activeCategory">
          <van-sidebar-item
              v-for="category in categories"
              :key="category.id"
              :title="category.name"
              @click="scrollToCategory(category.id)"
          />
        </van-sidebar>
      </div>

      <!-- 商品列表 -->
      <div class="product-list">
        <div
            v-for="category in categories"
            :id="`category-${category.id}`"
            :key="category.id"
            class="category-section"
        >
          <h3 class="category-title">{{ category.name }}</h3>

          <div class="products-grid">
            <product-card
                v-for="product in category.products"
                :key="product.id"
                :product="product"
                :show-desc="true"
                :show-stepper="true"
                @click="goToProduct(product.id)"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 购物车底部栏 -->
    <div v-if="cartStore.totalQuantity > 0" class="cart-bar">
      <van-badge :content="cartStore.totalQuantity" class="cart-badge">
        <van-icon name="shopping-cart-o" size="24"/>
      </van-badge>

      <div class="cart-info">
        <div class="total-price">{{ formatPrice(cartStore.totalPrice) }}</div>
        <div class="delivery-info">另需配送费{{ formatPrice(shopInfo.delivery_fee || 0) }}</div>
      </div>

      <van-button
          class="checkout-btn"
          round
          type="primary"
          @click="goToCart"
      >
        去结算
      </van-button>
    </div>

    <loading :loading="loading" text="加载中..."/>
  </div>
</template>

<script setup>
import {ref, onMounted, computed} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {useCartStore} from '../stores/cart'
import {shopApi} from '../api/shop'
import {productApi} from '../api/product'
import AppHeader from '../components/AppHeader.vue'
import ProductCard from '../components/ProductCard.vue'
import Loading from '../components/Loading.vue'
import {formatPrice} from '../utils'

const route = useRoute()
const router = useRouter()
const cartStore = useCartStore()

const shopId = ref(route.params.shopId)
const loading = ref(false)
const activeCategory = ref(0)
const shopInfo = ref({})
const categories = ref([])

onMounted(async () => {
  await loadShopInfo()
  await loadCategories()
  await cartStore.getCart()
})

const loadShopInfo = async () => {
  try {
    const response = await shopApi.getShop(shopId.value)
    shopInfo.value = response.data
  } catch (error) {
    console.error('加载店铺信息失败:', error)
  }
}

const loadCategories = async () => {
  loading.value = true
  try {
    const response = await productApi.getCategories(shopId.value)
    categories.value = response.data

    // 为每个分类加载商品
    for (const category of categories.value) {
      const productResponse = await productApi.getPublicProducts(shopId.value, {
        category_id: category.id,
        status: 'active'
      })
      category.products = productResponse.data.results || productResponse.data
    }
  } catch (error) {
    console.error('加载分类失败:', error)
  } finally {
    loading.value = false
  }
}

const scrollToCategory = (categoryId) => {
  const element = document.getElementById(`category-${categoryId}`)
  if (element) {
    element.scrollIntoView({behavior: 'smooth'})
  }
}

const goToProduct = (productId) => {
  router.push(`/product/${productId}`)
}

const goToCart = () => {
  router.push('/cart')
}
</script>

<style lang="scss" scoped>
@use '../styles/variables' as *;
@use "sass:color";

.menu-page {
  padding-bottom: 60px;

  .menu-container {
    display: flex;
    height: calc(100vh - 100px);

    .category-sidebar {
      width: 100px;
      background: white;
      border-right: 1px solid $border-color;

      :deep(.van-sidebar-item) {
        padding: 16px 8px;
      }

      :deep(.van-sidebar-item--select) {
        color: $primary-color;
        background: color.adjust($primary-color, $lightness: 40%);
      }
    }

    .product-list {
      flex: 1;
      overflow-y: auto;
      background: $background-color;

      .category-section {
        background: white;
        margin-bottom: 10px;
        padding: 15px;

        .category-title {
          margin: 0 0 15px 0;
          font-size: $font-size-lg;
          font-weight: bold;
          padding-bottom: 8px;
          border-bottom: 1px solid $border-color;
        }

        .products-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
      }
    }
  }

  .cart-bar {
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

    .cart-badge {
      margin-right: 15px;
    }

    .cart-info {
      flex: 1;

      .total-price {
        font-size: $font-size-lg;
        font-weight: bold;
        color: $danger-color;
      }

      .delivery-info {
        font-size: $font-size-sm;
        color: $text-color-light;
      }
    }

    .checkout-btn {
      height: 36px;
      padding: 0 20px;
    }
  }
}
</style>
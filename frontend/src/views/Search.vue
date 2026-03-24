<template>
  <div class="search-page">
    <app-header :show-back="true" title="搜索"/>

    <!-- 搜索栏 -->
    <div class="search-bar">
      <van-search
          v-model="keyword"
          placeholder="搜索店铺或商品"
          shape="round"
          show-action
          @cancel="handleCancel"
          @search="handleSearch"
      >
        <template #action>
          <div @click="handleSearch">搜索</div>
        </template>
      </van-search>
    </div>

    <!-- 搜索历史 -->
    <div v-if="!hasSearched && searchHistory.length > 0" class="history-section">
      <div class="section-header">
        <span>搜索历史</span>
        <van-icon name="delete-o" @click="clearHistory"/>
      </div>
      <div class="history-tags">
        <van-tag
            v-for="(item, index) in searchHistory"
            :key="index"
            plain
            size="medium"
            type="primary"
            @click="searchByHistory(item)"
        >
          {{ item }}
        </van-tag>
      </div>
    </div>

    <!-- 热门搜索 -->
    <div v-if="!hasSearched" class="hot-section">
      <div class="section-header">
        <span>热门搜索</span>
      </div>
      <div class="hot-tags">
        <van-tag
            v-for="(tag, index) in hotTags"
            :key="index"
            size="medium"
            type="primary"
            @click="searchByTag(tag)"
        >
          {{ tag }}
        </van-tag>
      </div>
    </div>

    <!-- 搜索结果 - 店铺 -->
    <div v-if="hasSearched && shops.length > 0" class="result-section">
      <div class="section-title">相关店铺</div>
      <div class="shops-list">
        <div
            v-for="shop in shops"
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
            <van-tag v-if="shop.is_active" size="mini" type="success">营业中</van-tag>
          </div>
        </div>
      </div>
    </div>

    <!-- 搜索结果 - 商品 -->
    <div v-if="hasSearched && products.length > 0" class="result-section">
      <div class="section-title">相关商品</div>
      <div class="products-list">
        <product-card
            v-for="product in products"
            :key="product.id"
            :product="product"
            :show-add-button="true"
            @click="goToProduct(product.id)"
            @add-to-cart="handleAddToCart"
        />
      </div>
    </div>

    <!-- 空状态 -->
    <van-empty
        v-if="hasSearched && shops.length === 0 && products.length === 0"
        description="未找到相关内容"
        image="search"
    />

    <loading :loading="loading" text="加载中..."/>
  </div>
</template>

<script setup>
import {ref, onMounted} from 'vue'
import {useRouter, useRoute} from 'vue-router'
import {showToast, showSuccessToast} from 'vant'
import {shopApi} from '../api/shop'
import {productApi} from '../api/product'
import {useCartStore} from '../stores/cart'
import AppHeader from '../components/AppHeader.vue'
import ProductCard from '../components/ProductCard.vue'
import Loading from '../components/Loading.vue'
import {getImageUrl} from '../utils'

const router = useRouter()
const route = useRoute()
const cartStore = useCartStore()

const keyword = ref('')
const loading = ref(false)
const hasSearched = ref(false)
const searchHistory = ref([])
const shops = ref([])
const products = ref([])

const hotTags = ref([
  '奶茶',
  '咖啡',
  '蛋糕',
  '披萨',
  '汉堡',
  '果汁'
])

onMounted(() => {
  // 从 URL 获取搜索关键词
  const queryKeyword = route.query.q
  if (queryKeyword) {
    keyword.value = queryKeyword
    handleSearch()
  }
  loadHistory()
})

const loadHistory = () => {
  const history = localStorage.getItem('search_history')
  if (history) {
    searchHistory.value = JSON.parse(history)
  }
}

const saveHistory = (keyword) => {
  if (!searchHistory.value.includes(keyword)) {
    searchHistory.value.unshift(keyword)
    // 只保留最近 10 条
    searchHistory.value = searchHistory.value.slice(0, 10)
    localStorage.setItem('search_history', JSON.stringify(searchHistory.value))
  }
}

const clearHistory = () => {
  searchHistory.value = []
  localStorage.removeItem('search_history')
}

const handleSearch = async () => {
  if (!keyword.value.trim()) {
    showToast('请输入搜索内容')
    return
  }

  loading.value = true
  hasSearched.value = true

  try {
    // 保存搜索历史
    saveHistory(keyword.value)

    // 搜索店铺
    const shopResponse = await shopApi.getShops({
      search: keyword.value,
      is_active: true
    })
    shops.value = shopResponse.data.results || shopResponse.data

    // 搜索商品
    const productResponse = await productApi.getPublicProducts('', {
      search: keyword.value,
      status: 'active'
    })
    products.value = productResponse.data.results || productResponse.data
  } catch (error) {
    console.error('搜索失败:', error)
    showToast('搜索失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

const handleCancel = () => {
  router.back()
}

const searchByHistory = (item) => {
  keyword.value = item
  handleSearch()
}

const searchByTag = (tag) => {
  keyword.value = tag
  handleSearch()
}

const goToShop = (shopId) => {
  router.push(`/shop/${shopId}`)
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

<style lang="scss" scoped>
@use '../styles/variables' as *;

.search-page {
  min-height: 100vh;
  background: $background-color;

  .search-bar {
    background: white;
    padding: 10px;
  }

  .history-section,
  .hot-section {
    background: white;
    padding: 15px;
    margin-bottom: 10px;

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      font-size: $font-size-md;
      font-weight: bold;
      color: $text-color;

      .van-icon {
        font-size: 16px;
        color: $text-color-light;
      }
    }

    .history-tags,
    .hot-tags {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
  }

  .result-section {
    background: white;
    padding: 15px;
    margin-bottom: 10px;

    .section-title {
      font-size: $font-size-lg;
      font-weight: bold;
      margin-bottom: 15px;
      color: $text-color;
    }

    .shops-list {
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
            margin: 0 0 6px 0;
            font-size: $font-size-md;
            font-weight: bold;
            @include multi-line-ellipsis(1);
          }

          .shop-desc {
            margin: 0 0 6px 0;
            font-size: $font-size-sm;
            color: $text-color-light;
            @include multi-line-ellipsis(2);
          }
        }
      }
    }

    .products-list {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }
  }
}
</style>

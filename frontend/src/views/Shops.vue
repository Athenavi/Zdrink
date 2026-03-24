<template>
  <div class="shops-page">
    <app-header :show-back="true" title="全部店铺"/>

    <!-- 搜索和筛选 -->
    <div class="filter-section">
      <van-search
          v-model="searchKeyword"
          placeholder="搜索店铺"
          shape="round"
          @search="handleSearch"
      />

      <div class="filter-tags">
        <van-tag
            v-for="type in shopTypes"
            :key="type.value"
            :type="selectedType === type.value ? 'primary' : 'default'"
            plain
            size="medium"
            @click="selectType(type.value)"
        >
          {{ type.label }}
        </van-tag>
      </div>
    </div>

    <!-- 店铺列表 -->
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
        >
          <template v-slot:error>
            <div class="image-error">
              <van-icon name="photo-fail" size="24"/>
            </div>
          </template>
        </van-image>

        <div class="shop-info">
          <div class="shop-header">
            <h3 class="shop-name">{{ shop.name }}</h3>
            <van-tag v-if="shop.is_active" size="mini" type="success">营业中</van-tag>
          </div>

          <p class="shop-description">{{ shop.description }}</p>

          <div class="shop-meta">
            <div class="meta-item">
              <van-icon name="location-o"/>
              <span>{{ shop.address || '未知地址' }}</span>
            </div>
            <div v-if="shop.rating" class="meta-item">
              <van-rate
                  v-model="shop.rating"
                  allow-half
                  color="#ffd21e"
                  readonly
                  size="12"
              />
              <span class="rating-text">{{ shop.rating }}</span>
            </div>
          </div>

          <div class="shop-features">
            <van-tag v-if="shop.allow_delivery" plain size="mini">外卖</van-tag>
            <van-tag v-if="shop.allow_pickup" plain size="mini">自取</van-tag>
            <van-tag v-if="shop.allow_dine_in" plain size="mini">堂食</van-tag>
          </div>
        </div>

        <van-icon class="arrow-icon" name="arrow"/>
      </div>
    </div>

    <!-- 空状态 -->
    <van-empty
        v-if="!loading && shops.length === 0"
        description="暂无店铺"
        image="search"
    />

    <!-- 下拉加载 -->
    <van-list
        v-model:loading="loading"
        :finished="finished"
        finished-text="没有更多了"
        @load="onLoad"
        @pulling-down="onPullingDown"
    >
      <div style="height: 50px;"></div>
    </van-list>

    <loading :loading="loading" text="加载中..."/>
  </div>
</template>

<script setup>
import {ref, onMounted} from 'vue'
import {useRouter} from 'vue-router'
import {shopApi} from '../api/shop'
import AppHeader from '../components/AppHeader.vue'
import Loading from '../components/Loading.vue'
import {getImageUrl} from '../utils'

const router = useRouter()

const searchKeyword = ref('')
const selectedType = ref('')
const loading = ref(false)
const finished = ref(false)
const shops = ref([])
const page = ref(1)

const shopTypes = ref([
  {label: '全部', value: ''},
  {label: '餐厅', value: 'restaurant'},
  {label: '咖啡厅', value: 'cafe'},
  {label: '酒吧', value: 'bar'},
  {label: '烘焙店', value: 'bakery'},
  {label: '其他', value: 'other'}
])

onMounted(() => {
  loadShops()
})

const loadShops = async () => {
  if (loading.value) return

  loading.value = true
  try {
    const params = {
      is_active: true,
      page: page.value,
      page_size: 10
    }

    if (selectedType.value) {
      params.shop_type = selectedType.value
    }

    if (searchKeyword.value) {
      params.search = searchKeyword.value
    }

    const response = await shopApi.getShops(params)
    const newShops = response.data.results || response.data

    if (page.value === 1) {
      shops.value = newShops
    } else {
      shops.value = [...shops.value, ...newShops]
    }

    finished.value = newShops.length < 10
    page.value++
  } catch (error) {
    console.error('加载店铺失败:', error)
  } finally {
    loading.value = false
  }
}

const onLoad = () => {
  loadShops()
}

const onPullingDown = () => {
  page.value = 1
  shops.value = []
  finished.value = false
  loadShops()
}

const handleSearch = () => {
  page.value = 1
  shops.value = []
  finished.value = false
  loadShops()
}

const selectType = (type) => {
  selectedType.value = type
  page.value = 1
  shops.value = []
  finished.value = false
  loadShops()
}

const goToShop = (shopId) => {
  router.push(`/shop/${shopId}`)
}
</script>

<style lang="scss" scoped>
@use '../styles/variables' as *;

.shops-page {
  min-height: 100vh;
  background: $background-color;
  padding-bottom: 20px;

  .filter-section {
    background: white;
    padding: 10px;

    .filter-tags {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 10px;
    }
  }

  .shops-list {
    padding: 10px;

    .shop-item {
      background: white;
      border-radius: $border-radius-lg;
      padding: 15px;
      margin-bottom: 10px;
      display: flex;
      position: relative;

      .shop-logo {
        width: 80px;
        height: 80px;
        border-radius: $border-radius;
        margin-right: 12px;
        flex-shrink: 0;

        .image-error {
          @include flex-center;
          height: 100%;
          background: $background-color;
          color: $text-color-light;
        }
      }

      .shop-info {
        flex: 1;
        min-width: 0;

        .shop-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;

          .shop-name {
            margin: 0;
            font-size: $font-size-lg;
            font-weight: bold;
            color: $text-color;
            @include multi-line-ellipsis(1);
          }
        }

        .shop-description {
          margin: 0 0 8px 0;
          font-size: $font-size-sm;
          color: $text-color-light;
          @include multi-line-ellipsis(2);
        }

        .shop-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          font-size: $font-size-xs;
          color: $text-color-light;

          .meta-item {
            display: flex;
            align-items: center;
            gap: 4px;

            .van-icon {
              font-size: 14px;
            }

            .rating-text {
              margin-left: 4px;
              color: $warning-color;
            }
          }
        }

        .shop-features {
          display: flex;
          gap: 6px;
        }
      }

      .arrow-icon {
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
        color: $text-color-light;
      }
    }
  }
}
</style>

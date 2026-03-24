<template>
  <div class="categories-page">
    <app-header :show-back="true" title="全部分类"/>

    <!-- 分类列表 -->
    <div class="categories-list">
      <div
          v-for="category in categories"
          :key="category.id"
          class="category-item"
          @click="goToCategory(category)"
      >
        <van-image
            :src="getImageUrl(category.icon)"
            class="category-icon"
            fit="cover"
            round
        >
          <template v-slot:error>
            <div class="icon-error">
              <van-icon name="apps-o" size="24"/>
            </div>
          </template>
        </van-image>

        <div class="category-info">
          <h3 class="category-name">{{ category.name }}</h3>
          <p v-if="category.description" class="category-desc">
            {{ category.description }}
          </p>
          <div v-if="category.product_count !== undefined" class="category-meta">
            <span>{{ category.product_count }}个商品</span>
          </div>
        </div>

        <van-icon class="arrow-icon" name="arrow"/>
      </div>
    </div>

    <!-- 空状态 -->
    <van-empty
        v-if="!loading && categories.length === 0"
        description="暂无分类"
        image="search"
    />

    <loading :loading="loading" text="加载中..."/>
  </div>
</template>

<script setup>
import {ref, onMounted} from 'vue'
import {useRouter} from 'vue-router'
import {productApi} from '../api/product'
import AppHeader from '../components/AppHeader.vue'
import Loading from '../components/Loading.vue'
import {getImageUrl} from '../utils'

const router = useRouter()
const loading = ref(false)
const categories = ref([])

onMounted(async () => {
  await loadCategories()
})

const loadCategories = async () => {
  loading.value = true
  try {
    const response = await productApi.getCategories()
    categories.value = response.data.results || response.data
  } catch (error) {
    console.error('加载分类失败:', error)
  } finally {
    loading.value = false
  }
}

const goToCategory = (category) => {
  router.push({
    path: '/products',
    query: {
      category_id: category.id,
      category_name: category.name
    }
  })
}
</script>

<style lang="scss" scoped>
@use '../styles/variables' as *;

.categories-page {
  min-height: 100vh;
  background: $background-color;

  .categories-list {
    padding: 10px;

    .category-item {
      background: white;
      border-radius: $border-radius-lg;
      padding: 15px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      position: relative;

      .category-icon {
        width: 60px;
        height: 60px;
        margin-right: 15px;
        flex-shrink: 0;

        .icon-error {
          @include flex-center;
          height: 100%;
          background: $background-color;
          color: $text-color-light;
        }
      }

      .category-info {
        flex: 1;
        min-width: 0;

        .category-name {
          margin: 0 0 6px 0;
          font-size: $font-size-lg;
          font-weight: bold;
          color: $text-color;
          @include multi-line-ellipsis(1);
        }

        .category-desc {
          margin: 0 0 6px 0;
          font-size: $font-size-sm;
          color: $text-color-light;
          @include multi-line-ellipsis(2);
        }

        .category-meta {
          font-size: $font-size-xs;
          color: $text-color-light;
        }
      }

      .arrow-icon {
        color: $text-color-light;
        font-size: 16px;
      }
    }
  }
}
</style>

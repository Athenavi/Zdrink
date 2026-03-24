<template>
  <div class="favorites-page">
    <app-header :show-back="true" title="我的收藏"/>

    <!-- 选项卡 -->
    <van-tabs v-model:active="activeTab">
      <van-tab name="products" title="商品">
        <div class="favorites-list">
          <div
              v-for="item in favoriteProducts"
              :key="item.id"
              class="product-item"
          >
            <van-image
                :src="getImageUrl(item.image)"
                class="product-image"
                fit="cover"
            >
              <template v-slot:error>
                <div class="image-error">
                  <van-icon name="photo-fail" size="24"/>
                </div>
              </template>
            </van-image>

            <div class="product-info">
              <h3 class="product-name">{{ item.name }}</h3>
              <div class="product-desc">{{ item.description }}</div>
              <div class="product-meta">
                <span class="price">¥{{ formatPrice(item.price) }}</span>
                <van-tag v-if="item.stock > 0" plain size="mini">有货</van-tag>
                <van-tag v-else size="mini" type="danger">缺货</van-tag>
              </div>
            </div>

            <div class="product-actions">
              <van-button
                  plain
                  size="small"
                  @click="goToProduct(item)"
              >
                查看
              </van-button>
              <van-button
                  plain
                  size="small"
                  type="danger"
                  @click="removeFavorite(item)"
              >
                删除
              </van-button>
            </div>
          </div>

          <van-empty
              v-if="favoriteProducts.length === 0"
              description="暂无收藏商品"
              image="star-o"
          />
        </div>
      </van-tab>

      <van-tab name="shops" title="店铺">
        <div class="favorites-list">
          <div
              v-for="item in favoriteShops"
              :key="item.id"
              class="shop-item"
          >
            <van-image
                :src="getImageUrl(item.logo)"
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
              <h3 class="shop-name">{{ item.name }}</h3>
              <p class="shop-desc">{{ item.description }}</p>
              <div class="shop-meta">
                <van-tag v-if="item.is_active" size="mini" type="success">营业中</van-tag>
                <van-rate
                    v-model="item.rating"
                    allow-half
                    color="#ffd21e"
                    readonly
                    size="12"
                />
              </div>
            </div>

            <div class="shop-actions">
              <van-button
                  plain
                  size="small"
                  @click="goToShop(item)"
              >
                进店
              </van-button>
              <van-button
                  plain
                  size="small"
                  type="danger"
                  @click="removeFavorite(item, 'shop')"
              >
                删除
              </van-button>
            </div>
          </div>

          <van-empty
              v-if="favoriteShops.length === 0"
              description="暂无收藏店铺"
              image="star-o"
          />
        </div>
      </van-tab>
    </van-tabs>
  </div>
</template>

<script setup>
import {ref, onMounted} from 'vue'
import {useRouter} from 'vue-router'
import {showDialog, showSuccessToast, showToast} from 'vant'
import AppHeader from '../components/AppHeader.vue'
import {getImageUrl, formatPrice} from '../utils'

const router = useRouter()
const activeTab = ref('products')
const loading = ref(false)

const favoriteProducts = ref([])
const favoriteShops = ref([])

// 模拟数据（实际应该从 API 获取）
const mockProducts = [
  {
    id: 1,
    name: '招牌奶茶',
    description: '经典口味，香浓顺滑',
    price: 15.8,
    image: '/images/product1.jpg',
    stock: 100
  },
  {
    id: 2,
    name: '拿铁咖啡',
    description: '精选咖啡豆制作',
    price: 22.0,
    image: '/images/product2.jpg',
    stock: 50
  }
]

const mockShops = [
  {
    id: 1,
    name: 'Zdrink 旗舰店',
    description: '专业茶饮品牌',
    logo: '/images/shop1.jpg',
    rating: 4.8,
    is_active: true
  }
]

onMounted(() => {
  loadFavorites()
})

const loadFavorites = async () => {
  // TODO: 从 API 加载收藏列表
  favoriteProducts.value = mockProducts
  favoriteShops.value = mockShops
}

const goToProduct = (product) => {
  router.push(`/product/${product.id}`)
}

const goToShop = (shop) => {
  router.push(`/shop/${shop.id}`)
}

const removeFavorite = (item, type = 'product') => {
  showDialog({
    title: '确认删除',
    message: `确定要取消收藏该${type === 'shop' ? '店铺' : '商品'}吗？`,
    showCancelButton: true,
  }).then(async () => {
    // TODO: 调用 API 删除收藏
    if (type === 'shop') {
      favoriteShops.value = favoriteShops.value.filter(s => s.id !== item.id)
    } else {
      favoriteProducts.value = favoriteProducts.value.filter(p => p.id !== item.id)
    }
    showSuccessToast('取消成功')
  })
}
</script>

<style lang="scss" scoped>
@use '../styles/variables' as *;

.favorites-page {
  min-height: 100vh;
  background: $background-color;

  .favorites-list {
    padding: 10px;

    .product-item,
    .shop-item {
      background: white;
      border-radius: $border-radius-lg;
      padding: 15px;
      margin-bottom: 10px;
      display: flex;
      gap: 12px;

      .product-image,
      .shop-logo {
        width: 100px;
        height: 100px;
        border-radius: $border-radius;
        flex-shrink: 0;

        .image-error {
          @include flex-center;
          height: 100%;
          background: $background-color;
          color: $text-color-light;
        }
      }

      .product-info,
      .shop-info {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        justify-content: space-between;

        .product-name,
        .shop-name {
          margin: 0;
          font-size: $font-size-md;
          font-weight: bold;
          color: $text-color;
          @include multi-line-ellipsis(1);
        }

        .product-desc,
        .shop-desc {
          margin: 6px 0;
          font-size: $font-size-sm;
          color: $text-color-light;
          @include multi-line-ellipsis(2);
        }

        .product-meta,
        .shop-meta {
          display: flex;
          align-items: center;
          gap: 8px;

          .price {
            font-size: $font-size-lg;
            color: $danger-color;
            font-weight: bold;
          }
        }
      }

      .product-actions,
      .shop-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
        justify-content: center;

        .van-button {
          height: 28px;
          padding: 0 10px;
          font-size: $font-size-xs;
        }
      }
    }
  }
}
</style>

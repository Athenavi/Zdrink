<template>
  <div class="product-page">
    <app-header :title="product.name" :show-cart="true" />

    <div class="product-container" v-if="product.id">
      <!-- 商品图片轮播 -->
      <div class="product-images">
        <van-swipe :autoplay="3000" indicator-color="white">
          <van-swipe-item v-for="(image, index) in productImages" :key="index">
            <van-image
              :src="getImageUrl(image)"
              fit="cover"
              :alt="product.name"
            />
          </van-swipe-item>
        </van-swipe>
      </div>

      <!-- 商品基础信息 -->
      <div class="product-basic-info">
        <div class="product-price-section">
          <span class="current-price">{{ formatPrice(displayPrice) }}</span>
          <span v-if="product.cost_price" class="cost-price">
            {{ formatPrice(product.cost_price) }}
          </span>
        </div>
        <h1 class="product-name">{{ product.name }}</h1>
        <p class="product-description">{{ product.description }}</p>

        <div class="product-meta">
          <span class="sales">月售{{ product.sales_count || 0 }}</span>
          <span class="rating">评分{{ product.rating || 5.0 }}</span>
        </div>
      </div>

      <!-- 规格选择 -->
      <div class="spec-section" v-if="product.skus && product.skus.length > 1">
        <div class="section-title">规格选择</div>
        <div class="spec-options">
          <van-radio-group v-model="selectedSkuId">
            <van-radio
              v-for="sku in availableSkus"
              :key="sku.id"
              :name="sku.id"
              :disabled="!sku.is_in_stock"
            >
              <div class="sku-option">
                <span class="sku-name">{{ getSkuName(sku) }}</span>
                <span class="sku-price">{{ formatPrice(sku.price) }}</span>
                <span v-if="!sku.is_in_stock" class="stock-status">缺货</span>
                <span v-else-if="sku.is_low_stock" class="stock-status low-stock">
                  仅剩{{ sku.stock_quantity }}件
                </span>
              </div>
            </van-radio>
          </van-radio-group>
        </div>
      </div>

      <!-- 商品属性 -->
      <div class="attribute-section" v-if="product.attributes && product.attributes.length > 0">
        <div class="section-title">定制选项</div>
        <div class="attribute-options">
          <div
            v-for="attribute in product.attributes"
            :key="attribute.id"
            class="attribute-item"
          >
            <div class="attribute-name">
              {{ attribute.name }}
              <span v-if="attribute.is_required" class="required">*</span>
            </div>
            <div class="attribute-values">
              <van-radio-group v-model="selectedAttributes[attribute.id]">
                <van-radio
                  v-for="option in attribute.options"
                  :key="option.id"
                  :name="option.id"
                >
                  <div class="option-item">
                    <span class="option-value">{{ option.value }}</span>
                    <span v-if="option.additional_price > 0" class="additional-price">
                      +{{ formatPrice(option.additional_price) }}
                    </span>
                  </div>
                </van-radio>
              </van-radio-group>
            </div>
          </div>
        </div>
      </div>

      <!-- 商品详情 -->
      <div class="product-detail">
        <div class="section-title">商品详情</div>
        <div class="detail-content">
          <div class="detail-item">
            <van-icon name="clock-o" />
            <span>预计{{ product.preparation_time || 10 }}分钟制作完成</span>
          </div>
          <div v-if="product.allow_customization" class="detail-item">
            <van-icon name="edit" />
            <span>支持定制要求</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部操作栏 -->
    <div class="product-actions">
      <div class="action-left">
        <van-button
          icon="shop-o"
          type="default"
          round
          @click="goToShop"
        >
          店铺
        </van-button>
      </div>

      <div class="action-right">
        <van-stepper
          v-model="quantity"
          :min="1"
          :max="maxQuantity"
          button-size="28"
          class="quantity-stepper"
        />
        <van-button
          type="primary"
          round
          size="large"
          :disabled="!canAddToCart"
          @click="addToCart"
        >
          {{ addButtonText }}
        </van-button>
      </div>
    </div>

    <loading :loading="loading" text="加载中..." />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showSuccessToast, showFailToast } from 'vant'
import { useCartStore } from '../stores/cart'
import { productApi } from '../api/product'
import AppHeader from '../components/AppHeader.vue'
import Loading from '../components/Loading.vue'
import { formatPrice, getImageUrl } from '../utils'

const route = useRoute()
const router = useRouter()
const cartStore = useCartStore()

const productId = ref(route.params.productId)
const loading = ref(false)
const product = ref({})
const quantity = ref(1)
const selectedSkuId = ref(null)
const selectedAttributes = reactive({})

onMounted(async () => {
  await loadProduct()
})

// 商品图片
const productImages = computed(() => {
  const images = []
  if (product.value.main_image) {
    images.push(product.value.main_image)
  }
  if (product.value.images && Array.isArray(product.value.images)) {
    images.push(...product.value.images)
  }
  return images.length > 0 ? images : ['/images/product-placeholder.jpg']
})

// 可用的SKU
const availableSkus = computed(() => {
  return (product.value.skus || []).filter(sku => sku.is_active)
})

// 选中的SKU
const selectedSku = computed(() => {
  return availableSkus.value.find(sku => sku.id === selectedSkuId.value) || availableSkus.value[0]
})

// 显示价格
const displayPrice = computed(() => {
  if (selectedSku.value) {
    return selectedSku.value.price
  }
  return product.value.base_price
})

// 最大购买数量
const maxQuantity = computed(() => {
  if (selectedSku.value) {
    return Math.min(selectedSku.value.stock_quantity, 99)
  }
  return 99
})

// 是否可以添加到购物车
const canAddToCart = computed(() => {
  if (!selectedSku.value) return false
  return selectedSku.value.is_in_stock && quantity.value > 0
})

// 添加按钮文本
const addButtonText = computed(() => {
  if (!selectedSku.value || !selectedSku.value.is_in_stock) {
    return '缺货'
  }
  return `加入购物车`
})

const loadProduct = async () => {
  loading.value = true
  try {
    const response = await productApi.getProduct(productId.value)
    product.value = response.data

    // 设置默认选中的SKU
    if (product.value.skus && product.value.skus.length > 0) {
      const defaultSku = product.value.skus.find(sku => sku.is_active && sku.is_in_stock)
      selectedSkuId.value = defaultSku ? defaultSku.id : product.value.skus[0].id
    }

    // 初始化属性选择
    if (product.value.attributes) {
      product.value.attributes.forEach(attr => {
        if (attr.options && attr.options.length > 0) {
          selectedAttributes[attr.id] = attr.options[0].id
        }
      })
    }
  } catch (error) {
    console.error('加载商品失败:', error)
    showFailToast('商品加载失败')
  } finally {
    loading.value = false
  }
}

const getSkuName = (sku) => {
  if (!sku.specifications || sku.specifications.length === 0) {
    return '默认规格'
  }

  return sku.specifications.map(spec =>
    `${spec.specification.display_name}: ${spec.display_value}`
  ).join(' ')
}

const addToCart = async () => {
  if (!canAddToCart.value) return

  try {
    const cartData = {
      product_id: product.value.id,
      quantity: quantity.value
    }

    // 添加SKU信息
    if (selectedSku.value && selectedSku.value.id !== product.value.id) {
      cartData.sku_id = selectedSku.value.id
    }

    // 添加属性选项
    const attributeOptionIds = Object.values(selectedAttributes).filter(id => id)
    if (attributeOptionIds.length > 0) {
      cartData.attribute_option_ids = attributeOptionIds
    }

    await cartStore.addToCart(cartData)
    showSuccessToast('已添加到购物车')
    quantity.value = 1 // 重置数量
  } catch (error) {
    console.error('添加到购物车失败:', error)
    showFailToast('添加失败，请重试')
  }
}

const goToShop = () => {
  if (product.value.shop) {
    router.push(`/shop/${product.value.shop.id}`)
  }
}
</script>

<style scoped lang="scss">
@use '../styles/variables' as *;
@use "sass:color";
.product-page {
  padding-bottom: 80px;

  .product-container {
    .product-images {
      .van-swipe {
        height: 300px;
      }
    }

    .product-basic-info {
      padding: 15px;
      background: white;
      margin-bottom: 10px;

      .product-price-section {
        margin-bottom: 8px;

        .current-price {
          font-size: 24px;
          font-weight: bold;
          color: $danger-color;
        }

        .cost-price {
          margin-left: 8px;
          font-size: $font-size-sm;
          color: $text-color-light;
          text-decoration: line-through;
        }
      }

      .product-name {
        margin: 0 0 8px 0;
        font-size: $font-size-lg;
        font-weight: bold;
        line-height: 1.4;
      }

      .product-description {
        margin: 0 0 12px 0;
        font-size: $font-size-md;
        color: $text-color-light;
        line-height: 1.5;
      }

      .product-meta {
        display: flex;
        gap: 15px;
        font-size: $font-size-sm;
        color: $text-color-light;
      }
    }

    .spec-section,
    .attribute-section,
    .product-detail {
      background: white;
      margin-bottom: 10px;
      padding: 15px;

      .section-title {
        margin: 0 0 15px 0;
        font-size: $font-size-md;
        font-weight: bold;
        padding-bottom: 8px;
        border-bottom: 1px solid $border-color;
      }
    }

    .spec-options {
      .van-radio-group {
        width: 100%;
      }

      .sku-option {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;

        .sku-name {
          flex: 1;
        }

        .sku-price {
          margin: 0 10px;
          color: $danger-color;
          font-weight: bold;
        }

        .stock-status {
          font-size: $font-size-sm;
          color: $text-color-light;

          &.low-stock {
            color: $warning-color;
          }
        }
      }

      :deep(.van-radio) {
        width: 100%;
        padding: 8px 0;
        border-bottom: 1px solid $border-color;

        &:last-child {
          border-bottom: none;
        }

        .van-radio__label {
          width: 100%;
        }
      }
    }

    .attribute-options {
      .attribute-item {
        margin-bottom: 15px;

        &:last-child {
          margin-bottom: 0;
        }

        .attribute-name {
          margin-bottom: 8px;
          font-weight: bold;

          .required {
            color: $danger-color;
          }
        }

        .attribute-values {
          .van-radio-group {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }

          .option-item {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            border: 1px solid $border-color;
            border-radius: $border-radius;

            .additional-price {
              font-size: $font-size-sm;
              color: $danger-color;
            }
          }

          :deep(.van-radio--checked) {
            .option-item {
              border-color: $primary-color;
              background: lighten($primary-color, 40%);
            }
          }
        }
      }
    }

    .detail-content {
      .detail-item {
        display: flex;
        align-items: center;
        padding: 8px 0;

        .van-icon {
          margin-right: 8px;
          color: $primary-color;
        }
      }
    }
  }

  .product-actions {
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

    .action-left {
      margin-right: 15px;
    }

    .action-right {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 10px;

      .quantity-stepper {
        flex-shrink: 0;
      }

      .van-button {
        flex: 1;

        &:disabled {
          opacity: 0.6;
        }
      }
    }
  }
}
</style>
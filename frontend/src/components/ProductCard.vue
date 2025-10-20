<template>
  <div class="product-card" @click="handleClick">
    <div class="product-image">
      <van-image
        :src="getImageUrl(product.main_image)"
        fit="cover"
        :alt="product.name"
      >
        <template v-slot:error>
          <div class="image-error">
            <van-icon name="photo-fail" size="24" />
          </div>
        </template>
      </van-image>

      <!-- 商品标签 -->
      <div class="product-tags" v-if="showTags">
        <span v-if="product.is_featured" class="tag primary">推荐</span>
        <span v-if="product.status === 'out_of_stock'" class="tag danger">缺货</span>
      </div>
    </div>

    <div class="product-info">
      <h3 class="product-name">{{ product.name }}</h3>
      <p class="product-desc" v-if="product.description && showDesc">
        {{ product.description }}
      </p>

      <div class="product-price">
        <span class="price current">{{ formatPrice(displayPrice) }}</span>
        <span v-if="hasMultiplePrices" class="price-range">
          {{ formatPrice(minPrice) }}起
        </span>
      </div>

      <!-- 操作按钮 -->
      <div class="product-actions">
        <van-stepper
          v-if="showStepper && product.status !== 'out_of_stock'"
          v-model="quantity"
          :min="0"
          :max="maxStock"
          button-size="22"
          @change="handleQuantityChange"
        />
        <van-button
          v-else-if="showAddButton && product.status !== 'out_of_stock'"
          size="small"
          type="primary"
          round
          @click.stop="handleAddToCart"
        >
          <van-icon name="plus" size="14" />
        </van-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { showSuccessToast } from 'vant'
import { useCartStore } from '../stores/cart'
import { formatPrice, getImageUrl } from '../utils'

const props = defineProps({
  product: {
    type: Object,
    required: true
  },
  showTags: {
    type: Boolean,
    default: true
  },
  showDesc: {
    type: Boolean,
    default: false
  },
  showStepper: {
    type: Boolean,
    default: false
  },
  showAddButton: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['click', 'add-to-cart'])

const cartStore = useCartStore()
const quantity = ref(0)

// 计算显示价格
const displayPrice = computed(() => {
  return props.product.base_price
})

// 是否有多个价格（SKU）
const hasMultiplePrices = computed(() => {
  return props.product.skus && props.product.skus.length > 1
})

// 最低价格
const minPrice = computed(() => {
  if (!props.product.skus || props.product.skus.length === 0) {
    return props.product.base_price
  }

  const prices = props.product.skus.map(sku => parseFloat(sku.price))
  return Math.min(...prices)
})

// 最大库存
const maxStock = computed(() => {
  if (!props.product.skus || props.product.skus.length === 0) {
    return 99 // 默认最大数量
  }

  const totalStock = props.product.skus.reduce((sum, sku) => sum + sku.stock_quantity, 0)
  return Math.min(totalStock, 99)
})

const handleClick = () => {
  emit('click', props.product)
}

const handleAddToCart = async () => {
  try {
    await cartStore.addToCart({
      product_id: props.product.id,
      quantity: 1
    })
    showSuccessToast('已添加到购物车')
    emit('add-to-cart', props.product)
  } catch (error) {
    console.error('添加到购物车失败:', error)
  }
}

const handleQuantityChange = (value) => {
  // 这里可以实现数量变化的逻辑
  console.log('数量变化:', value)
}
</script>

<style scoped lang="scss">
@use '../styles/variables.scss' as *;
.product-card {
  background: white;
  border-radius: $border-radius-lg;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;

  &:active {
    transform: scale(0.98);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  }

  .product-image {
    position: relative;
    height: 120px;

    .van-image {
      width: 100%;
      height: 100%;
    }

    .image-error {
      @include flex-center;
      height: 100%;
      background: $background-color;
      color: $text-color-light;
    }

    .product-tags {
      position: absolute;
      top: 6px;
      left: 6px;

      .tag {
        margin-right: 4px;
      }
    }
  }

  .product-info {
    padding: 10px;

    .product-name {
      margin: 0 0 6px 0;
      font-size: $font-size-md;
      font-weight: bold;
      @include text-ellipsis;
    }

    .product-desc {
      margin: 0 0 8px 0;
      font-size: $font-size-sm;
      color: $text-color-light;
      @include multi-line-ellipsis(2);
      line-height: 1.4;
    }

    .product-price {
      display: flex;
      align-items: center;
      margin-bottom: 8px;

      .current {
        font-size: $font-size-lg;
      }

      .price-range {
        margin-left: 4px;
        font-size: $font-size-sm;
        color: $text-color-light;
      }
    }

    .product-actions {
      display: flex;
      justify-content: flex-end;
    }
  }
}
</style>
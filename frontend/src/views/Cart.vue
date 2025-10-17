<template>
  <div class="cart-page">
    <app-header title="购物车" />

    <div class="cart-container" v-if="cartStore.cartItems.length > 0">
      <!-- 购物车商品列表 -->
      <div class="cart-items">
        <div
          v-for="item in cartStore.cartItems"
          :key="item.id"
          class="cart-item"
        >
          <van-checkbox v-model="item.selected" />

          <van-image
            :src="getImageUrl(item.product.main_image)"
            class="item-image"
            fit="cover"
          />

          <div class="item-info">
            <h3 class="item-name">{{ item.product.name }}</h3>
            <p class="item-spec" v-if="item.sku">
              {{ getSkuSpecText(item.sku) }}
            </p>
            <div class="item-price">{{ formatPrice(item.unit_price) }}</div>
          </div>

          <div class="item-actions">
            <van-stepper
              v-model="item.quantity"
              :min="1"
              :max="99"
              @change="updateItemQuantity(item.id, item.quantity)"
            />
            <van-button
              type="danger"
              size="small"
              text="删除"
              @click="removeItem(item.id)"
            />
          </div>
        </div>
      </div>

      <!-- 结算栏 -->
      <div class="checkout-bar">
        <div class="select-all">
          <van-checkbox v-model="selectAll" @change="handleSelectAll">
            全选
          </van-checkbox>
        </div>

        <div class="total-info">
          <div class="total-price">
            合计: <span class="price">{{ formatPrice(selectedTotalPrice) }}</span>
          </div>
          <div class="delivery-fee" v-if="selectedTotalPrice > 0">
            配送费: {{ formatPrice(deliveryFee) }}
          </div>
        </div>

        <van-button
          type="primary"
          round
          class="checkout-btn"
          :disabled="selectedItems.length === 0"
          @click="goToCheckout"
        >
          去结算({{ selectedItems.length }})
        </van-button>
      </div>
    </div>

    <!-- 空购物车 -->
    <div class="empty-cart" v-else>
      <van-empty image="shopping-cart" description="购物车空空如也">
        <van-button type="primary" round @click="goToHome">
          去逛逛
        </van-button>
      </van-empty>
    </div>

    <loading :loading="loading" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showSuccessToast } from 'vant'
import { useCartStore } from '../stores/cart'
import AppHeader from '../components/AppHeader.vue'
import Loading from '../components/Loading.vue'
import { formatPrice, getImageUrl } from '../utils'

const router = useRouter()
const cartStore = useCartStore()

const loading = ref(false)

onMounted(async () => {
  await cartStore.getCart()
  // 初始化选中状态
  cartStore.cartItems.forEach(item => {
    if (item.selected === undefined) {
      item.selected = true
    }
  })
})

// 选中的商品
const selectedItems = computed(() => {
  return cartStore.cartItems.filter(item => item.selected)
})

// 选中商品总价
const selectedTotalPrice = computed(() => {
  return selectedItems.value.reduce((total, item) => {
    return total + (item.unit_price * item.quantity)
  }, 0)
})

// 全选状态
const selectAll = computed({
  get: () => cartStore.cartItems.length > 0 && cartStore.cartItems.every(item => item.selected),
  set: (value) => {
    cartStore.cartItems.forEach(item => {
      item.selected = value
    })
  }
})

// 配送费（这里可以根据业务逻辑调整）
const deliveryFee = computed(() => {
  return 5.00 // 固定配送费
})

const handleSelectAll = (checked) => {
  cartStore.cartItems.forEach(item => {
    item.selected = checked
  })
}

const updateItemQuantity = async (itemId, quantity) => {
  try {
    await cartStore.updateCartItem(itemId, quantity)
  } catch (error) {
    console.error('更新数量失败:', error)
  }
}

const removeItem = async (itemId) => {
  try {
    await showConfirmDialog({
      title: '确认删除',
      message: '确定要从购物车中删除这个商品吗？'
    })

    await cartStore.removeCartItem(itemId)
    showSuccessToast('删除成功')
  } catch (error) {
    // 用户取消删除
  }
}

const goToCheckout = () => {
  if (selectedItems.value.length === 0) {
    return
  }

  // 存储选中的商品信息
  const selectedCartItems = selectedItems.value.map(item => ({
    id: item.id,
    product_id: item.product.id,
    sku_id: item.sku?.id,
    quantity: item.quantity
  }))

  localStorage.setItem('selectedCartItems', JSON.stringify(selectedCartItems))
  router.push('/order/create')
}

const goToHome = () => {
  router.push('/home')
}

const getSkuSpecText = (sku) => {
  if (!sku || !sku.specifications) return ''

  return Object.values(sku.specifications).join(' ')
}
</script>

<style scoped lang="scss">
.cart-page {
  padding-bottom: 80px;

  .cart-container {
    .cart-items {
      .cart-item {
        display: flex;
        align-items: center;
        padding: 12px 15px;
        background: white;
        margin-bottom: 1px;

        .van-checkbox {
          margin-right: 10px;
        }

        .item-image {
          width: 60px;
          height: 60px;
          border-radius: $border-radius;
          margin-right: 12px;
        }

        .item-info {
          flex: 1;

          .item-name {
            margin: 0 0 4px 0;
            font-size: $font-size-md;
            font-weight: bold;
            @include text-ellipsis;
          }

          .item-spec {
            margin: 0 0 6px 0;
            font-size: $font-size-sm;
            color: $text-color-light;
          }

          .item-price {
            font-size: $font-size-lg;
            color: $danger-color;
            font-weight: bold;
          }
        }

        .item-actions {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
        }
      }
    }

    .checkout-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      max-width: $page-max-width;
      margin: 0 auto;
      background: white;
      display: flex;
      align-items: center;
      padding: 12px 15px;
      border-top: 1px solid $border-color;
      box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);

      .select-all {
        margin-right: 15px;
      }

      .total-info {
        flex: 1;

        .total-price {
          font-size: $font-size-lg;
          font-weight: bold;

          .price {
            color: $danger-color;
          }
        }

        .delivery-fee {
          font-size: $font-size-sm;
          color: $text-color-light;
        }
      }

      .checkout-btn {
        height: 40px;
        padding: 0 25px;

        &:disabled {
          opacity: 0.6;
        }
      }
    }
  }

  .empty-cart {
    padding-top: 100px;
  }
}
</style>
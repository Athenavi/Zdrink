<template>
  <div v-if="visible" class="print-preview">
    <van-overlay :show="visible" @click="handleClose">
      <div class="preview-container" @click.stop>
        <div class="preview-header">
          <h3>打印预览</h3>
          <van-icon name="cross" size="20" @click="handleClose"/>
        </div>

        <div class="preview-content">
          <!-- 小票预览 -->
          <div class="receipt-preview">
            <div class="receipt-header">
              <div class="shop-name">{{ previewData.shopName || 'ZDrink' }}</div>
              <div class="receipt-title">{{ getReceiptTitle(previewData.type) }}</div>
            </div>

            <div class="receipt-info">
              <div class="info-row">
                <span>订单号:</span>
                <span>{{ previewData.orderNo || 'ORD202603240001' }}</span>
              </div>
              <div class="info-row">
                <span>桌台号:</span>
                <span>{{ previewData.tableNumber || 'A01' }}</span>
              </div>
              <div class="info-row">
                <span>时间:</span>
                <span>{{ formatTime(new Date()) }}</span>
              </div>
            </div>

            <div class="receipt-items">
              <div class="items-header">
                <span>商品</span>
                <span>数量</span>
                <span>金额</span>
              </div>
              <div
                  v-for="(item, index) in previewData.items"
                  :key="index"
                  class="item-row"
              >
                <div class="item-name">{{ item.name }}</div>
                <div v-if="item.spec" class="item-spec">{{ item.spec }}</div>
                <div class="item-detail">
                  <span>x{{ item.quantity }}</span>
                  <span>¥{{ (item.price * item.quantity).toFixed(2) }}</span>
                </div>
              </div>
            </div>

            <div class="receipt-summary">
              <div class="summary-row">
                <span>商品总额:</span>
                <span>¥{{ previewData.totalAmount?.toFixed(2) || '0.00' }}</span>
              </div>
              <div v-if="previewData.deliveryFee > 0" class="summary-row">
                <span>配送费:</span>
                <span>¥{{ previewData.deliveryFee?.toFixed(2) || '0.00' }}</span>
              </div>
              <el-divider v-if="previewData.discountAmount > 0"/>
              <div v-if="previewData.discountAmount > 0" class="summary-row discount">
                <span>优惠:</span>
                <span>-¥{{ previewData.discountAmount?.toFixed(2) || '0.00' }}</span>
              </div>
              <div class="summary-row total">
                <span>实收:</span>
                <span>¥{{ calculateFinalAmount().toFixed(2) }}</span>
              </div>
            </div>

            <div class="receipt-footer">
              <div class="footer-text">感谢光临</div>
              <div class="footer-text">欢迎下次光临</div>
              <div v-if="previewData.remark" class="footer-note">
                备注：{{ previewData.remark }}
              </div>
            </div>
          </div>
        </div>

        <div class="preview-actions">
          <van-button
              block
              plain
              type="default"
              @click="handleClose"
          >
            取消
          </van-button>
          <van-button
              block
              type="primary"
              @click="handlePrint"
          >
            立即打印
          </van-button>
        </div>
      </div>
    </van-overlay>
  </div>
</template>

<script setup>

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  previewData: {
    type: Object,
    default: () => ({
      type: 'order_receipt', // order_receipt, kitchen_order, delivery
      shopName: '',
      orderNo: '',
      tableNumber: '',
      items: [],
      totalAmount: 0,
      deliveryFee: 0,
      discountAmount: 0,
      remark: ''
    })
  }
})

const emit = defineEmits(['update:visible', 'print', 'close'])

const handleClose = () => {
  emit('update:visible', false)
  emit('close')
}

const handlePrint = () => {
  emit('print', props.previewData)
  emit('update:visible', false)
}

const getReceiptTitle = (type) => {
  const titles = {
    order_receipt: '订单小票',
    kitchen_order: '厨房单',
    delivery: '外卖单',
    receipt: '收银小票'
  }
  return titles[type] || '订单小票'
}

const formatTime = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

const calculateFinalAmount = () => {
  const total = props.previewData.totalAmount || 0
  const delivery = props.previewData.deliveryFee || 0
  const discount = props.previewData.discountAmount || 0

  return (total + delivery - discount).toFixed(2)
}
</script>

<style lang="scss" scoped>
@use '../styles/variables' as *;

.print-preview {
  .preview-container {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90%;
    max-width: 400px;
    max-height: 80vh;
    background: white;
    border-radius: $border-radius-lg;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 20px;
    border-bottom: 1px solid $border-color;

    h3 {
      margin: 0;
      font-size: $font-size-lg;
      color: $text-color;
    }

    .van-icon {
      cursor: pointer;
    }
  }

  .preview-content {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    background: #f5f5f5;

    .receipt-preview {
      background: white;
      padding: 20px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.6;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .receipt-header {
      text-align: center;
      margin-bottom: 15px;
      border-bottom: 1px dashed #ddd;
      padding-bottom: 10px;

      .shop-name {
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 5px;
      }

      .receipt-title {
        font-size: 14px;
        color: #666;
      }
    }

    .receipt-info {
      margin-bottom: 15px;

      .info-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 5px;
      }
    }

    .receipt-items {
      margin-bottom: 15px;
      border-top: 1px dashed #ddd;
      padding-top: 10px;

      .items-header {
        display: flex;
        justify-content: space-between;
        font-weight: bold;
        margin-bottom: 8px;
      }

      .item-row {
        margin-bottom: 10px;
        padding-bottom: 10px;
        border-bottom: 1px dashed #f0f0f0;

        .item-name {
          font-weight: bold;
          margin-bottom: 3px;
        }

        .item-spec {
          font-size: 11px;
          color: #999;
          margin-bottom: 3px;
        }

        .item-detail {
          display: flex;
          justify-content: space-between;
        }
      }
    }

    .receipt-summary {
      border-top: 1px dashed #ddd;
      padding-top: 10px;

      .summary-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 5px;

        &.discount {
          color: $success-color;
        }

        &.total {
          font-weight: bold;
          font-size: 14px;
          margin-top: 8px;
        }
      }
    }

    .receipt-footer {
      text-align: center;
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px dashed #ddd;

      .footer-text {
        margin-bottom: 5px;
      }

      .footer-note {
        margin-top: 10px;
        font-size: 11px;
        color: #999;
      }
    }
  }

  .preview-actions {
    display: flex;
    gap: 10px;
    padding: 15px 20px;
    border-top: 1px solid $border-color;

    .van-button {
      flex: 1;
    }
  }
}
</style>

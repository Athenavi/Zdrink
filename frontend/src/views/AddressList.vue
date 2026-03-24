<template>
  <div class="address-list-page">
    <app-header :show-back="true" title="收货地址"/>

    <!-- 地址列表 -->
    <div class="addresses">
      <div
          v-for="address in addresses"
          :key="address.id"
          :class="{ active: address.is_default }"
          class="address-item"
          @click="selectAddress(address)"
      >
        <div class="address-content" @click.stop>
          <div class="address-header">
            <span class="contact-name">{{ address.name }}</span>
            <span class="contact-phone">{{ address.phone }}</span>
          </div>
          <div class="address-detail">
            <van-icon name="location-o"/>
            <span>{{ address.full_address }}</span>
          </div>
          <div v-if="address.is_default" class="address-tags">
            <van-tag size="mini" type="primary">默认</van-tag>
          </div>
        </div>

        <div class="address-actions">
          <van-button
              plain
              size="small"
              @click="editAddress(address)"
          >
            编辑
          </van-button>
          <van-button
              plain
              size="small"
              type="danger"
              @click="deleteAddress(address)"
          >
            删除
          </van-button>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <van-empty
        v-if="addresses.length === 0"
        description="暂无收货地址"
        image="location-o"
    >
      <van-button
          round
          type="primary"
          @click="addAddress"
      >
        添加地址
      </van-button>
    </van-empty>

    <!-- 添加按钮 -->
    <van-button
        block
        class="add-btn"
        icon="plus"
        round
        type="primary"
        @click="addAddress"
    >
      新建地址
    </van-button>
  </div>
</template>

<script setup>
import {ref, onMounted} from 'vue'
import {useRouter} from 'vue-router'
import {showDialog, showSuccessToast, showToast} from 'vant'
import AppHeader from '../components/AppHeader.vue'

const router = useRouter()
const addresses = ref([])

// 模拟数据（实际应该从 API 获取）
const mockAddresses = [
  {
    id: 1,
    name: '张三',
    phone: '138****1234',
    full_address: '北京市朝阳区 xxx 街道 xxx 号',
    is_default: true
  },
  {
    id: 2,
    name: '李四',
    phone: '139****5678',
    full_address: '上海市浦东新区 xxx 路 xxx 号',
    is_default: false
  }
]

onMounted(() => {
  loadAddresses()
})

const loadAddresses = async () => {
  // TODO: 从 API 加载地址列表
  addresses.value = mockAddresses
}

const selectAddress = (address) => {
  // TODO: 设置为默认地址
  showSuccessToast('已选择该地址')
}

const addAddress = () => {
  router.push('/address/edit')
}

const editAddress = (address) => {
  router.push(`/address/edit?id=${address.id}`)
}

const deleteAddress = (address) => {
  showDialog({
    title: '确认删除',
    message: '确定要删除该收货地址吗？',
    showCancelButton: true,
  }).then(async () => {
    // TODO: 调用 API 删除地址
    await loadAddresses()
    showSuccessToast('删除成功')
  })
}
</script>

<style lang="scss" scoped>
@use '../styles/variables' as *;

.address-list-page {
  min-height: 100vh;
  background: $background-color;
  padding-bottom: 70px;

  .addresses {
    padding: 10px;

    .address-item {
      background: white;
      border-radius: $border-radius-lg;
      padding: 15px;
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;

      &.active {
        border: 2px solid $primary-color;
      }

      .address-content {
        flex: 1;

        .address-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;

          .contact-name {
            font-size: $font-size-lg;
            font-weight: bold;
            color: $text-color;
          }

          .contact-phone {
            font-size: $font-size-md;
            color: $text-color-light;
          }
        }

        .address-detail {
          display: flex;
          align-items: flex-start;
          gap: 6px;
          font-size: $font-size-sm;
          color: $text-color-light;
          margin-bottom: 8px;

          .van-icon {
            margin-top: 2px;
          }
        }

        .address-tags {
          margin-top: 8px;
        }
      }

      .address-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-left: 10px;

        .van-button {
          height: 28px;
          padding: 0 10px;
          font-size: $font-size-xs;
        }
      }
    }
  }

  .add-btn {
    position: fixed;
    bottom: 20px;
    left: 10px;
    right: 10px;
    max-width: $page-max-width;
    margin: 0 auto;
    height: 48px;
  }
}
</style>

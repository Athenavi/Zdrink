<template>
  <div class="tables-page">
    <app-header title="桌台管理"/>

    <!-- 筛选栏 -->
    <div class="filter-section">
      <van-tabs v-model:active="activeTab" @change="handleTabChange">
        <van-tab name="all" title="全部"/>
        <van-tab name="available" title="空闲"/>
        <van-tab name="occupied" title="占用"/>
        <van-tab name="reserved" title="预订"/>
      </van-tabs>
    </div>

    <!-- 桌台列表 -->
    <div class="tables-list">
      <van-loading v-if="loading" text="加载中..."/>

      <div v-else-if="tables.length === 0" class="empty">
        <van-empty description="暂无桌台"/>
      </div>

      <div v-else class="table-grid">
        <div
            v-for="table in tables"
            :key="table.id"
            :class="`status-${table.status}`"
            class="table-item"
            @click="handleTableClick(table)"
        >
          <div class="table-header">
            <span class="table-number">{{ table.table_number }}</span>
            <van-tag :type="getStatusType(table.status)">
              {{ getStatusText(table.status) }}
            </van-tag>
          </div>

          <div class="table-info">
            <div class="info-row">
              <van-icon name="users"/>
              <span>{{ table.min_capacity }}-{{ table.max_capacity }}人</span>
            </div>
            <div v-if="table.floor || table.section" class="info-row">
              <van-icon name="location-o"/>
              <span>{{ table.floor }}{{ table.section }}</span>
            </div>
          </div>

          <div v-if="table.current_order" class="table-footer">
            <div class="order-info">
              <span class="label">当前订单:</span>
              <span class="order-no">{{ table.current_order.order_no }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 桌台详情弹窗 -->
    <van-popup
        v-model:show="showTableDetail"
        :style="{ height: '70%' }"
        position="bottom"
        round
    >
      <div class="table-detail-popup">
        <div class="popup-header">
          <h3>{{ selectedTable?.table_name || selectedTable?.table_number }}</h3>
          <van-icon name="cross" size="20" @click="showTableDetail = false"/>
        </div>

        <div v-if="selectedTable" class="popup-content">
          <van-cell-group inset>
            <van-cell :value="selectedTable.table_number" title="桌台号"/>
            <van-cell :value="getTableTypeText(selectedTable.table_type)" title="桌台类型"/>
            <van-cell :value="getStatusText(selectedTable.status)" title="状态">
              <template #right-icon>
                <van-tag :type="getStatusType(selectedTable.status)">
                  {{ getStatusText(selectedTable.status) }}
                </van-tag>
              </template>
            </van-cell>
            <van-cell :value="`${selectedTable.min_capacity}-${selectedTable.max_capacity}人`" title="容纳人数"/>
            <van-cell v-if="selectedTable.floor || selectedTable.section" title="位置">
              <template #title>
                <van-icon name="location-o" style="margin-right: 5px;"/>
                <span>位置</span>
              </template>
              <template #default>
                {{ selectedTable.floor }}{{ selectedTable.section }}
              </template>
            </van-cell>
          </van-cell-group>

          <!-- 当前订单信息 -->
          <div v-if="selectedTable.current_order" class="current-order">
            <h4>当前订单</h4>
            <van-cell-group inset>
              <van-cell :value="selectedTable.current_order.order_no" title="订单号"/>
              <van-cell :value="`¥${selectedTable.current_order.total_amount}`" title="订单金额"/>
              <van-cell :value="formatTime(selectedTable.current_order.created_at)" title="下单时间"/>
            </van-cell-group>
          </div>

          <!-- 操作按钮 -->
          <div class="actions">
            <van-button
                v-if="selectedTable.status === 'available'"
                block
                type="primary"
                @click="handleUpdateStatus('occupied')"
            >
              开台
            </van-button>
            <van-button
                v-if="selectedTable.status === 'occupied'"
                block
                type="success"
                @click="handleUpdateStatus('available')"
            >
              结账清台
            </van-button>
            <van-button
                block
                plain
                type="primary"
                @click="handleNavigateToOrder"
            >
              查看订单
            </van-button>
          </div>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import {onMounted, ref} from 'vue'
import {useRouter} from 'vue-router'
import {showConfirmDialog, showToast} from 'vant'
import AppHeader from '../components/AppHeader.vue'
import {posApi} from '@/api/pos'

const router = useRouter()
const loading = ref(false)
const activeTab = ref('all')
const tables = ref([])
const showTableDetail = ref(false)
const selectedTable = ref(null)

onMounted(async () => {
  await loadTables()
})

const loadTables = async () => {
  loading.value = true
  try {
    const response = await posApi.getTablesStatus({status: activeTab.value !== 'all' ? activeTab.value : undefined})
    tables.value = response.data || []
  } catch (error) {
    console.error('加载桌台失败:', error)
    showToast('加载桌台失败')
  } finally {
    loading.value = false
  }
}

const handleTabChange = () => {
  loadTables()
}

const handleTableClick = (table) => {
  selectedTable.value = table
  showTableDetail.value = true
}

const handleUpdateStatus = async (newStatus) => {
  try {
    await showConfirmDialog({
      title: '确认操作',
      message: `确定要将桌台状态改为${getStatusText(newStatus)}吗？`
    })

    await posApi.updateTableStatus({
      table_id: selectedTable.value.id,
      status: newStatus,
      order_id: selectedTable.value.current_order?.id
    })

    showToast('操作成功')
    showTableDetail.value = false
    await loadTables()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('更新桌台状态失败:', error)
      showToast('操作失败')
    }
  }
}

const handleNavigateToOrder = () => {
  if (selectedTable.value?.current_order) {
    router.push(`/order/${selectedTable.value.current_order.order_no}`)
  } else {
    showToast('当前桌台无订单')
  }
}

const getStatusType = (status) => {
  const typeMap = {
    available: 'success',
    occupied: 'danger',
    reserved: 'primary',
    cleaning: 'warning',
    maintenance: 'info'
  }
  return typeMap[status] || 'default'
}

const getStatusText = (status) => {
  const textMap = {
    available: '空闲',
    occupied: '占用',
    reserved: '预订',
    cleaning: '清洁中',
    maintenance: '维护中'
  }
  return textMap[status] || status
}

const getTableTypeText = (type) => {
  const typeMap = {
    standard: '标准桌',
    booth: '卡座',
    bar: '吧台',
    private: '包间',
    outdoor: '户外桌'
  }
  return typeMap[type] || type
}

const formatTime = (timeString) => {
  return new Date(timeString).toLocaleString()
}
</script>

<style lang="scss" scoped>
@use '../styles/variables' as *;

.tables-page {
  min-height: 100vh;
  background: $background-color;

  .filter-section {
    background: white;
    margin-bottom: 10px;
  }

  .tables-list {
    padding: 10px;

    .empty {
      padding: 100px 0;
      text-align: center;
    }

    .table-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .table-item {
      background: white;
      border-radius: $border-radius-lg;
      padding: 15px;
      transition: all 0.3s;
      cursor: pointer;

      &.status-available {
        border-left: 4px solid $success-color;
      }

      &.status-occupied {
        border-left: 4px solid $danger-color;
      }

      &.status-reserved {
        border-left: 4px solid $primary-color;
      }

      &.status-cleaning {
        border-left: 4px solid $warning-color;
      }

      &:active {
        transform: scale(0.98);
      }

      .table-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;

        .table-number {
          font-size: $font-size-lg;
          font-weight: bold;
          color: $text-color;
        }
      }

      .table-info {
        .info-row {
          display: flex;
          align-items: center;
          margin-bottom: 8px;
          font-size: $font-size-sm;
          color: $text-color-light;

          .van-icon {
            margin-right: 5px;
          }

          &:last-child {
            margin-bottom: 0;
          }
        }
      }

      .table-footer {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid $border-color;

        .order-info {
          font-size: $font-size-xs;
          color: $text-color-light;

          .label {
            margin-right: 5px;
          }

          .order-no {
            color: $primary-color;
          }
        }
      }
    }
  }

  .table-detail-popup {
    .popup-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
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

    .popup-content {
      padding: 20px;
      padding-bottom: calc(20px + env(safe-area-inset-bottom));

      .current-order {
        margin: 20px 0;

        h4 {
          margin: 0 0 10px 0;
          font-size: $font-size-md;
          color: $text-color;
        }
      }

      .actions {
        margin-top: 30px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
    }
  }
}
</style>

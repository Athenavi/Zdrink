<template>
  <div class="print-queue-page">
    <app-header title="打印队列"/>

    <!-- 筛选栏 -->
    <div class="filter-section">
      <van-tabs v-model:active="activeTab" @change="handleTabChange">
        <van-tab name="all" title="全部"/>
        <van-tab name="pending" title="待打印"/>
        <van-tab name="printing" title="打印中"/>
        <van-tab name="completed" title="已完成"/>
        <van-tab name="failed" title="失败"/>
      </van-tabs>
    </div>

    <!-- 打印任务列表 -->
    <div class="print-queue-list">
      <van-loading v-if="loading" text="加载中..."/>

      <div v-else-if="printTasks.length === 0" class="empty">
        <van-empty description="暂无打印任务"/>
      </div>

      <div v-else class="task-list">
        <van-swipe-cell
            v-for="task in printTasks"
            :key="task.id"
            :right-width="60"
        >
          <div :class="`status-${task.status}`" class="task-item">
            <div class="task-header">
              <span class="task-id">#{{ task.id }}</span>
              <van-tag :type="getStatusType(task.status)">
                {{ getStatusText(task.status) }}
              </van-tag>
            </div>

            <div class="task-content">
              <div class="info-row">
                <span class="label">打印机:</span>
                <span>{{ task.printer_name }}</span>
              </div>
              <div class="info-row">
                <span class="label">打印内容:</span>
                <span>{{ task.content_type_text }}</span>
              </div>
              <div class="info-row">
                <span class="label">份数:</span>
                <span>{{ task.copies }}份</span>
              </div>
              <div class="info-row">
                <span class="label">创建时间:</span>
                <span>{{ formatTime(task.created_at) }}</span>
              </div>
              <div v-if="task.printed_at" class="info-row">
                <span class="label">打印时间:</span>
                <span>{{ formatTime(task.printed_at) }}</span>
              </div>
            </div>

            <div v-if="task.status === 'failed'" class="task-footer">
              <van-icon color="#ee0a24" name="warning-o"/>
              <span class="error-message">{{ task.error_message }}</span>
            </div>
          </div>

          <template #right>
            <van-button
                v-if="task.status === 'failed'"
                icon="replay"
                square
                style="height: 100%"
                type="primary"
                @click="handleRetry(task)"
            />
          </template>
        </van-swipe-cell>
      </div>
    </div>

    <!-- 打印预览弹窗 -->
    <van-popup
        v-model:show="showPreview"
        :style="{ width: '90%', maxWidth: '500px' }"
        position="center"
        round
    >
      <div class="preview-popup">
        <div class="popup-header">
          <h3>打印预览</h3>
          <van-icon name="cross" size="20" @click="showPreview = false"/>
        </div>

        <div class="popup-content">
          <div class="preview-content" v-html="previewData.content"></div>
        </div>

        <div class="popup-actions">
          <van-button
              block
              type="primary"
              @click="handlePrintFromPreview"
          >
            立即打印
          </van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import {onMounted, ref} from 'vue'
import {showConfirmDialog, showToast} from 'vant'
import AppHeader from '../components/AppHeader.vue'
import {printingApi} from '@/api/printing'

const loading = ref(false)
const activeTab = ref('all')
const printTasks = ref([])
const showPreview = ref(false)
const previewData = ref({})

onMounted(async () => {
  await loadPrintTasks()
})

const loadPrintTasks = async () => {
  loading.value = true
  try {
    const params = activeTab.value !== 'all' ? {status: activeTab.value} : {}
    const response = await printingApi.getPrintTasks(params)
    printTasks.value = response.data.results || response.data
  } catch (error) {
    console.error('加载打印任务失败:', error)
    showToast('加载失败')
  } finally {
    loading.value = false
  }
}

const handleTabChange = () => {
  loadPrintTasks()
}

const handleRetry = async (task) => {
  try {
    await showConfirmDialog({
      title: '确认重试',
      message: `确定要重打打印任务 #${task.id} 吗？`
    })

    await printingApi.retryPrintTask(task.id)

    showToast('已重新提交打印任务')
    await loadPrintTasks()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('重试失败:', error)
      showToast('重试失败')
    }
  }
}

const handlePreview = (task) => {
  previewData.value = {
    taskId: task.id,
    content: task.print_content || '打印内容预览'
  }
  showPreview.value = true
}

const handlePrintFromPreview = () => {
  showToast('开始打印...')
  showPreview.value = false
}

const getStatusType = (status) => {
  const typeMap = {
    pending: 'warning',
    printing: 'primary',
    completed: 'success',
    failed: 'danger'
  }
  return typeMap[status] || 'default'
}

const getStatusText = (status) => {
  const textMap = {
    pending: '待打印',
    printing: '打印中',
    completed: '已完成',
    failed: '失败'
  }
  return textMap[status] || status
}

const formatTime = (timeString) => {
  if (!timeString) return ''
  return new Date(timeString).toLocaleString()
}
</script>

<style lang="scss" scoped>
@use '../styles/variables' as *;

.print-queue-page {
  min-height: 100vh;
  background: $background-color;

  .filter-section {
    background: white;
    margin-bottom: 10px;
  }

  .print-queue-list {
    padding: 10px;

    .empty {
      padding: 100px 0;
      text-align: center;
    }

    .task-list {
      .task-item {
        background: white;
        border-radius: $border-radius-lg;
        padding: 15px;
        margin-bottom: 10px;

        &.status-pending {
          border-left: 4px solid $warning-color;
        }

        &.status-printing {
          border-left: 4px solid $primary-color;
        }

        &.status-completed {
          border-left: 4px solid $success-color;
        }

        &.status-failed {
          border-left: 4px solid $danger-color;
        }

        .task-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;

          .task-id {
            font-size: $font-size-sm;
            color: $text-color-light;
          }
        }

        .task-content {
          .info-row {
            display: flex;
            margin-bottom: 8px;
            font-size: $font-size-sm;

            .label {
              width: 80px;
              color: $text-color-light;
            }

            &:last-child {
              margin-bottom: 0;
            }
          }
        }

        .task-footer {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid $border-color;
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: $font-size-xs;
          color: $danger-color;

          .error-message {
            flex: 1;
          }
        }
      }
    }
  }

  .preview-popup {
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
      max-height: 400px;
      overflow-y: auto;

      .preview-content {
        font-family: 'Courier New', monospace;
        white-space: pre-wrap;
        line-height: 1.6;
      }
    }

    .popup-actions {
      padding: 20px;
      border-top: 1px solid $border-color;
    }
  }
}
</style>

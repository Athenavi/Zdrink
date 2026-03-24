<template>
  <div class="print-status-toast">
    <van-toast v-model:show="visible" :duration="3000" position="top">
      <div :class="`status-${status}`" class="status-content">
        <van-icon
            :color="statusColor"
            :name="statusIcon"
            size="40px"
        />
        <div class="status-text">{{ message }}</div>
        <div v-if="detail" class="status-detail">{{ detail }}</div>

        <!-- 进度条 -->
        <van-progress
            v-if="status === 'printing'"
            :percentage="progress"
            color="#1989fa"
            stroke-width="4"
        />

        <!-- 重试按钮 -->
        <van-button
            v-if="status === 'failed'"
            plain
            size="small"
            type="primary"
            @click="handleRetry"
        >
          重试
        </van-button>
      </div>
    </van-toast>
  </div>
</template>

<script setup>
import {computed, ref, watch} from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    default: 'pending', // pending, printing, success, failed
    validator: (value) => ['pending', 'printing', 'success', 'failed'].includes(value)
  },
  message: {
    type: String,
    default: '准备打印...'
  },
  detail: {
    type: String,
    default: ''
  },
  printerName: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'retry', 'close'])

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const progress = ref(0)

// 模拟打印进度
watch(() => props.status, (newStatus) => {
  if (newStatus === 'printing') {
    simulateProgress()
  } else if (newStatus === 'success' || newStatus === 'failed') {
    progress.value = newStatus === 'success' ? 100 : 0
  }
}, {immediate: true})

const simulateProgress = () => {
  progress.value = 0
  const interval = setInterval(() => {
    if (progress.value < 90) {
      progress.value += 10
    }
  }, 300)

  // 当状态变为成功或失败时清除定时器
  const cleanup = watch(() => props.status, (newStatus) => {
    if (newStatus === 'success' || newStatus === 'failed') {
      clearInterval(interval)
      cleanup()
    }
  })
}

const statusIcon = computed(() => {
  const icons = {
    pending: 'underway-o',
    printing: 'loading',
    success: 'checked',
    failed: 'warning-o'
  }
  return icons[props.status] || 'underway-o'
})

const statusColor = computed(() => {
  const colors = {
    pending: '#1989fa',
    printing: '#1989fa',
    success: '#07c160',
    failed: '#ee0a24'
  }
  return colors[props.status] || '#1989fa'
})

const handleRetry = () => {
  emit('retry')
}

// 自动关闭
watch(() => props.status, (newStatus) => {
  if (newStatus === 'success' || newStatus === 'failed') {
    setTimeout(() => {
      visible.value = false
      emit('close')
    }, 3000)
  }
})
</script>

<style lang="scss" scoped>
@use '../styles/variables' as *;

.print-status-toast {
  .status-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
    min-width: 200px;

    .status-text {
      margin-top: 15px;
      font-size: $font-size-md;
      color: #333;
      text-align: center;
    }

    .status-detail {
      margin-top: 8px;
      font-size: $font-size-sm;
      color: #999;
      text-align: center;
    }

    .van-progress {
      margin-top: 15px;
      width: 100%;
    }

    .van-button {
      margin-top: 15px;
    }
  }
}
</style>

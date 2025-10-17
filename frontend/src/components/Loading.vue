<template>
  <div class="loading-overlay" v-if="loading">
    <div class="loading-content">
      <van-loading type="spinner" size="24px" />
      <span class="loading-text" v-if="text">{{ text }}</span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  loading: {
    type: Boolean,
    default: false
  },
  text: {
    type: String,
    default: ''
  }
})
</script>

<style scoped lang="scss">
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9999;
  @include flex-center;

  .loading-content {
    background: white;
    padding: 20px;
    border-radius: $border-radius-lg;
    text-align: center;

    .loading-text {
      display: block;
      margin-top: 10px;
      font-size: $font-size-md;
      color: $text-color;
    }
  }
}
</style>
<template>
  <div class="help-page">
    <app-header :show-back="true" title="帮助中心"/>

    <!-- 常见问题分类 -->
    <van-cell-group class="section">
      <van-cell
          v-for="category in helpCategories"
          :key="category.id"
          :label="category.description"
          :title="category.name"
          is-link
          @click="goToCategory(category)"
      >
        <template #icon>
          <van-icon :color="category.color" :name="category.icon" size="20"/>
        </template>
      </van-cell>
    </van-cell-group>

    <!-- 常见问题列表 -->
    <div class="faq-section">
      <div class="section-header">
        <h3>常见问题</h3>
      </div>

      <van-collapse v-model="activeQuestions">
        <van-collapse-item
            v-for="faq in faqList"
            :key="faq.id"
            :name="faq.id"
            :title="faq.question"
        >
          <div class="faq-answer">{{ faq.answer }}</div>
        </van-collapse-item>
      </van-collapse>
    </div>

    <!-- 联系客服 -->
    <div class="contact-section">
      <div class="section-header">
        <h3>联系我们</h3>
      </div>

      <van-cell-group>
        <van-cell
            icon="phone-o"
            is-link
            title="客服热线"
            value="400-123-4567"
            @click="callService"
        />
        <van-cell
            icon="service-o"
            is-link
            title="在线客服"
            @click="chatWithService"
        />
        <van-cell
            icon="wechat"
            is-link
            title="官方微信"
            value="zdrink_service"
            @click="copyWechat"
        />
        <van-cell
            icon="clock-o"
            title="服务时间"
            value="9:00 - 21:00"
        />
      </van-cell-group>
    </div>

    <!-- 意见反馈 -->
    <div class="feedback-section">
      <div class="section-header">
        <h3>意见反馈</h3>
      </div>

      <van-cell-group>
        <van-field
            v-model="feedbackContent"
            autosize
            maxlength="500"
            placeholder="请描述您遇到的问题或建议..."
            rows="4"
            show-word-limit
            type="textarea"
        />
      </van-cell-group>

      <van-uploader
          v-model="feedbackFiles"
          :max-count="3"
          class="feedback-uploader"
          multiple
      />

      <van-button
          block
          class="submit-btn"
          round
          type="primary"
          @click="submitFeedback"
      >
        提交反馈
      </van-button>
    </div>
  </div>
</template>

<script setup>
import {ref} from 'vue'
import {useRouter} from 'vue-router'
import {showToast, showSuccessToast, showDialog, showImagePreview} from 'vant'
import AppHeader from '../components/AppHeader.vue'

const router = useRouter()
const activeQuestions = ref([])
const feedbackContent = ref('')
const feedbackFiles = ref([])

const helpCategories = ref([
  {
    id: 1,
    name: '下单支付',
    description: '下单、支付相关问题',
    icon: 'shopping-cart-o',
    color: '#1989fa'
  },
  {
    id: 2,
    name: '配送说明',
    description: '配送范围、时间相关问题',
    icon: 'logistics',
    color: '#07c160'
  },
  {
    id: 3,
    name: '售后服务',
    description: '退款、退货相关问题',
    icon: 'refund',
    color: '#ee0a24'
  },
  {
    id: 4,
    name: '账户安全',
    description: '登录、注册、密码相关问题',
    icon: 'shield-o',
    color: '#7232dd'
  },
  {
    id: 5,
    name: '积分会员',
    description: '积分、会员等级相关问题',
    icon: 'star-o',
    color: '#ffd21e'
  }
])

const faqList = ref([
  {
    id: 1,
    question: '如何下单？',
    answer: '选择商品后加入购物车，点击结算按钮，填写配送信息并选择支付方式，确认订单后完成支付即可。'
  },
  {
    id: 2,
    question: '支持哪些支付方式？',
    answer: '目前支持微信支付、支付宝支付、余额支付等多种支付方式。'
  },
  {
    id: 3,
    question: '多久可以送达？',
    answer: '一般情况下，订单会在 30-60 分钟内送达，具体以店铺实际配送时间为准。'
  },
  {
    id: 4,
    question: '如何申请退款？',
    answer: '在订单详情页点击"申请售后"，选择退款原因并提交申请，商家审核后会为您处理退款。'
  },
  {
    id: 5,
    question: '积分如何获得？',
    answer: '消费可获得积分（1 元=1 积分），每日签到也可获得积分，邀请好友注册同样有积分奖励。'
  },
  {
    id: 6,
    question: '积分如何使用？',
    answer: '积分可在积分商城兑换商品，或在支付时抵扣现金（100 积分=1 元）。'
  }
])

const goToCategory = (category) => {
  router.push({
    path: '/help/category',
    query: {id: category.id, name: category.name}
  })
}

const callService = () => {
  window.location.href = 'tel:400-123-4567'
}

const chatWithService = () => {
  showDialog({
    title: '在线客服',
    message: '在线客服功能开发中，请稍后拨打客服热线。',
  })
}

const copyWechat = () => {
  // 复制到剪贴板
  navigator.clipboard.writeText('zdrink_service').then(() => {
    showSuccessToast('已复制微信号')
  }).catch(() => {
    showToast('复制失败，请手动添加：zdrink_service')
  })
}

const submitFeedback = async () => {
  if (!feedbackContent.value.trim()) {
    showToast('请填写反馈内容')
    return
  }

  try {
    // TODO: 调用 API 提交反馈
    console.log('提交反馈:', {
      content: feedbackContent.value,
      files: feedbackFiles.value
    })

    showSuccessToast('反馈提交成功，我们会尽快处理')
    feedbackContent.value = ''
    feedbackFiles.value = []
  } catch (error) {
    showToast('提交失败，请稍后重试')
  }
}
</script>

<style lang="scss" scoped>
@use '../styles/variables' as *;

.help-page {
  min-height: 100vh;
  background: $background-color;

  .section {
    margin: 10px;
    border-radius: $border-radius-lg;
    overflow: hidden;
  }

  .faq-section,
  .contact-section,
  .feedback-section {
    background: white;
    padding: 15px;
    margin: 10px;
    border-radius: $border-radius-lg;

    .section-header {
      margin-bottom: 15px;

      h3 {
        margin: 0;
        font-size: $font-size-lg;
        color: $text-color;
      }
    }
  }

  .faq-answer {
    font-size: $font-size-sm;
    color: $text-color-light;
    line-height: 1.8;
    padding: 10px 0;
  }

  .feedback-uploader {
    padding: 10px 0;
  }

  .submit-btn {
    margin-top: 20px;
    height: 44px;
  }
}
</style>

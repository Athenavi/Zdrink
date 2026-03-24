<template>
  <div class="address-edit-page">
    <app-header :title="isEdit ? '编辑地址' : '新建地址'"/>

    <div class="form-container">
      <van-cell-group>
        <van-field
            v-model="formData.name"
            label="收货人"
            maxlength="20"
            placeholder="请输入收货人姓名"
        />

        <van-field
            v-model="formData.phone"
            label="手机号"
            maxlength="11"
            placeholder="请输入手机号码"
            type="tel"
        />

        <van-field
            v-model="formData.region"
            is-link
            label="地区"
            placeholder="请选择省/市/区"
            readonly
            @click="showRegionPicker = true"
        />

        <van-field
            v-model="formData.detail"
            autosize
            label="详细地址"
            maxlength="100"
            placeholder="请输入街道、楼栋号等详细信息"
            rows="2"
            show-word-limit
            type="textarea"
        />

        <van-field
            v-model="formData.label"
            clearable
            label="地址标签"
            placeholder="如：家、公司、学校等"
        />

        <van-switch-cell
            v-model="formData.is_default"
            title="设为默认地址"
        />
      </van-cell-group>

      <!-- 省市区选择器 -->
      <van-popup
          v-model:show="showRegionPicker"
          position="bottom"
      >
        <van-area
            v-model="selectedArea"
            :area-list="areaList"
            @cancel="showRegionPicker = false"
            @confirm="onAreaConfirm"
        />
      </van-popup>

      <!-- 提交按钮 -->
      <div class="submit-section">
        <van-button
            :loading="submitting"
            block
            round
            type="primary"
            @click="submitForm"
        >
          保存地址
        </van-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import {ref, computed, onMounted} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {showToast, showSuccessToast} from 'vant'
import AppHeader from '../components/AppHeader.vue'
// 引入 vant 的省市区数据
import areaList from '@vant/area-data'

const route = useRoute()
const router = useRouter()

const isEdit = computed(() => !!route.query.id)
const submitting = ref(false)
const showRegionPicker = ref(false)
const selectedArea = ref([''])

const formData = ref({
  name: '',
  phone: '',
  region: '',
  detail: '',
  label: '',
  is_default: false
})

onMounted(() => {
  if (isEdit.value) {
    loadAddress()
  }
})

const loadAddress = async () => {
  // TODO: 从 API 加载地址详情
  const mockData = {
    id: route.query.id,
    name: '张三',
    phone: '138****1234',
    province: '北京市',
    city: '市辖区',
    district: '朝阳区',
    full_address: '北京市朝阳区 xxx 街道 xxx 号',
    label: '家',
    is_default: true
  }

  formData.value = {
    name: mockData.name,
    phone: mockData.phone,
    region: `${mockData.province} ${mockData.city} ${mockData.district}`,
    detail: mockData.full_address.replace(mockData.region, '').trim(),
    label: mockData.label || '',
    is_default: mockData.is_default
  }

  // 设置选中的区域
  selectedArea.value = [
    getAreaCode(mockData.province),
    getAreaCode(mockData.city),
    getAreaCode(mockData.district)
  ]
}

const getAreaCode = (name) => {
  // 简单的地名转区号逻辑（实际需要更完善的实现）
  return Object.keys(areaList.area_list).find(
      code => areaList.area_list[code] === name
  ) || ''
}

const onAreaConfirm = ({selectedOptions}) => {
  formData.value.region = selectedOptions.map(option => option.text).join(' ')
  showRegionPicker.value = false
}

const validateForm = () => {
  if (!formData.value.name.trim()) {
    showToast('请输入收货人姓名')
    return false
  }

  if (!formData.value.phone.trim()) {
    showToast('请输入手机号码')
    return false
  }

  if (!/^\d{11}$/.test(formData.value.phone)) {
    showToast('请输入正确的手机号码')
    return false
  }

  if (!formData.value.region) {
    showToast('请选择所在地区')
    return false
  }

  if (!formData.value.detail.trim()) {
    showToast('请输入详细地址')
    return false
  }

  return true
}

const submitForm = async () => {
  if (!validateForm()) return

  submitting.value = true
  try {
    // TODO: 调用 API 保存或更新地址
    console.log('提交地址:', formData.value)

    showSuccessToast(isEdit.value ? '修改成功' : '添加成功')
    setTimeout(() => {
      router.back()
    }, 1000)
  } catch (error) {
    showToast('操作失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
@use '../styles/variables' as *;

.address-edit-page {
  min-height: 100vh;
  background: $background-color;

  .form-container {
    padding: 10px;

    .submit-section {
      margin-top: 30px;
      padding: 0 10px;

      .van-button {
        height: 48px;
      }
    }
  }
}
</style>

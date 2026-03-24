<template>
  <div class="printer-settings-page">
    <app-header title="打印机设置"/>

    <van-cell-group inset>
      <!-- 打印机列表 -->
      <van-cell arrow-direction="right" is-link title="添加打印机" @click="showAddPrinter = true">
        <template #icon>
          <van-icon color="#1989fa" name="add-o"/>
        </template>
      </van-cell>

      <div class="printer-list">
        <van-swipe-cell
            v-for="printer in printers"
            :key="printer.id"
            :right-width="120"
        >
          <div class="printer-item">
            <div class="printer-header">
              <div class="printer-info">
                <h4>{{ printer.name }}</h4>
                <p>{{ printer.description }}</p>
              </div>
              <div class="printer-status">
                <van-tag :type="printer.is_online ? 'success' : 'danger'">
                  {{ printer.is_online ? '在线' : '离线' }}
                </van-tag>
              </div>
            </div>

            <div class="printer-details">
              <div class="detail-row">
                <van-icon name="shop"/>
                <span>类型：{{ getPrinterTypeText(printer.printer_type) }}</span>
              </div>
              <div class="detail-row">
                <van-icon name="underway-o"/>
                <span>IP: {{ printer.ip_address || 'USB 连接' }}</span>
              </div>
              <div class="detail-row">
                <van-icon name="passed"/>
                <span>默认模板：{{ printer.default_template ? '是' : '否' }}</span>
              </div>
            </div>

            <div class="printer-actions">
              <van-button
                  plain
                  size="mini"
                  type="primary"
                  @click="handleTestPrint(printer)"
              >
                测试打印
              </van-button>
              <van-button
                  plain
                  size="mini"
                  type="warning"
                  @click="handleEditPrinter(printer)"
              >
                编辑
              </van-button>
            </div>
          </div>

          <template #right>
            <div style="display: flex; height: 100%">
              <van-button
                  icon="setting-o"
                  square
                  style="height: 100%"
                  type="primary"
                  @click="handleEditPrinter(printer)"
              />
              <van-button
                  icon="delete-o"
                  square
                  style="height: 100%"
                  type="danger"
                  @click="handleDeletePrinter(printer)"
              />
            </div>
          </template>
        </van-swipe-cell>
      </div>

      <!-- 打印模板 -->
      <van-cell center title="打印模板管理">
        <template #label>
          <span>配置不同场景的打印模板样式</span>
        </template>
      </van-cell>

      <div class="template-list">
        <div
            v-for="template in templates"
            :key="template.id"
            class="template-item"
            @click="handleEditTemplate(template)"
        >
          <div class="template-header">
            <div class="template-info">
              <h4>{{ template.name }}</h4>
              <van-tag plain type="primary">{{ getTemplateTypeText(template.template_type) }}</van-tag>
            </div>
            <van-checkbox
                v-model="template.is_default"
                icon-size="16px"
                @click.stop="handleSetDefault(template)"
            >
              默认
            </van-checkbox>
          </div>
          <div class="template-preview">
            <div class="preview-text">{{ template.content_preview }}</div>
          </div>
        </div>
      </div>
    </van-cell-group>

    <!-- 添加/编辑打印机弹窗 -->
    <van-popup
        v-model:show="showAddPrinter"
        :style="{ height: '80%' }"
        position="bottom"
        round
    >
      <div class="printer-form-popup">
        <div class="popup-header">
          <h3>{{ editingPrinter ? '编辑打印机' : '添加打印机' }}</h3>
          <van-icon name="cross" size="20" @click="closePrinterForm"/>
        </div>

        <div class="popup-content">
          <van-form @submit="onSubmitPrinter">
            <van-field
                v-model="printerForm.name"
                label="打印机名称"
                placeholder="请输入打印机名称"
                required
            />

            <van-field
                v-model="printerForm.description"
                label="描述"
                placeholder="请输入打印机描述"
                rows="2"
                type="textarea"
            />

            <van-field
                v-model="printerForm.printer_type"
                is-link
                label="打印机类型"
                placeholder="点击选择打印机类型"
                readonly
                required
                @click="showPrinterTypePicker = true"
            />
            <van-popup v-model:show="showPrinterTypePicker" position="bottom">
              <van-picker
                  :columns="printerTypeColumns"
                  @cancel="showPrinterTypePicker = false"
                  @confirm="onPrinterTypeConfirm"
              />
            </van-popup>

            <van-field
                v-model="printerForm.connection_type"
                is-link
                label="连接方式"
                placeholder="点击选择连接方式"
                readonly
                required
                @click="showConnectionTypePicker = true"
            />
            <van-popup v-model:show="showConnectionTypePicker" position="bottom">
              <van-picker
                  :columns="connectionTypeColumns"
                  @cancel="showConnectionTypePicker = false"
                  @confirm="onConnectionTypeConfirm"
              />
            </van-popup>

            <van-field
                v-show="printerForm.connection_type === 'network'"
                v-model="printerForm.ip_address"
                label="IP 地址"
                placeholder="例如：192.168.1.100"
            />

            <van-field
                v-show="printerForm.connection_type === 'network'"
                v-model="printerForm.port"
                label="端口"
                placeholder="例如：9100"
                type="number"
            />

            <div style="margin: 16px;">
              <van-button block native-type="submit" round type="primary">
                保存
              </van-button>
            </div>
          </van-form>
        </div>
      </div>
    </van-popup>

    <!-- 测试打印弹窗 -->
    <van-dialog
        v-model:show="showTestPrintDialog"
        show-cancel-button
        title="测试打印"
        @confirm="confirmTestPrint"
    >
      <van-field
          v-model="testPrintContent"
          autosize
          placeholder="输入测试打印内容"
          rows="3"
          type="textarea"
      />
    </van-dialog>
  </div>
</template>

<script setup>
import {onMounted, ref} from 'vue'
import {showConfirmDialog, showToast} from 'vant'
import AppHeader from '../components/AppHeader.vue'
import {printingApi} from '@/api/printing'

const loading = ref(false)
const printers = ref([])
const templates = ref([])
const showAddPrinter = ref(false)
const editingPrinter = ref(null)
const showTestPrintDialog = ref(false)
const testPrintContent = ref('')
const selectedPrinter = ref(null)

// 打印机表单数据
const printerForm = ref({
  name: '',
  description: '',
  printer_type: '',
  connection_type: '',
  ip_address: '',
  port: ''
})

// 选择器配置
const printerTypeColumns = [
  {text: '热敏打印机', value: 'thermal'},
  {text: '针式打印机', value: 'dot_matrix'},
  {text: '激光打印机', value: 'laser'}
]

const connectionTypeColumns = [
  {text: 'USB', value: 'usb'},
  {text: '网络', value: 'network'},
  {text: '蓝牙', value: 'bluetooth'}
]

const showPrinterTypePicker = ref(false)
const showConnectionTypePicker = ref(false)

onMounted(async () => {
  await loadPrinters()
  await loadTemplates()
})

const loadPrinters = async () => {
  try {
    const response = await printingApi.getPrinters()
    printers.value = response.data.results || response.data
  } catch (error) {
    console.error('加载打印机失败:', error)
    showToast('加载失败')
  }
}

const loadTemplates = async () => {
  try {
    const response = await printingApi.getTemplates()
    templates.value = response.data.results || response.data
  } catch (error) {
    console.error('加载模板失败:', error)
    showToast('加载失败')
  }
}

const onPrinterTypeConfirm = ({selectedOptions}) => {
  printerForm.value.printer_type = selectedOptions[0].value
  showPrinterTypePicker.value = false
}

const onConnectionTypeConfirm = ({selectedOptions}) => {
  printerForm.value.connection_type = selectedOptions[0].value
  showConnectionTypePicker.value = false
}

const onSubmitPrinter = async () => {
  try {
    if (editingPrinter.value) {
      await printingApi.updatePrinter(editingPrinter.value.id, printerForm.value)
      showToast('打印机已更新')
    } else {
      await printingApi.createPrinter(printerForm.value)
      showToast('打印机已添加')
    }
    closePrinterForm()
    await loadPrinters()
  } catch (error) {
    console.error('保存打印机失败:', error)
    showToast('保存失败')
  }
}

const closePrinterForm = () => {
  showAddPrinter.value = false
  editingPrinter.value = null
  printerForm.value = {
    name: '',
    description: '',
    printer_type: '',
    connection_type: '',
    ip_address: '',
    port: ''
  }
}

const handleEditPrinter = (printer) => {
  editingPrinter.value = printer
  printerForm.value = {
    ...printer,
    port: printer.port?.toString()
  }
  showAddPrinter.value = true
}

const handleDeletePrinter = async (printer) => {
  try {
    await showConfirmDialog({
      title: '确认删除',
      message: `确定要删除打印机"${printer.name}"吗？`
    })

    await printingApi.deletePrinter(printer.id)

    showToast('删除成功')
    await loadPrinters()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      showToast('删除失败')
    }
  }
}

const handleTestPrint = (printer) => {
  selectedPrinter.value = printer
  testPrintContent.value = '测试打印内容\n时间：' + new Date().toLocaleString()
  showTestPrintDialog.value = true
}

const confirmTestPrint = async () => {
  try {
    await printingApi.testPrint(selectedPrinter.value.id, {
      content: testPrintContent.value
    })

    showToast('测试打印已发送')
  } catch (error) {
    console.error('测试打印失败:', error)
    showToast('测试打印失败')
  }
}

const handleSetDefault = async (template) => {
  try {
    await printingApi.setDefaultTemplate(template.id)

    showToast('已设置为默认模板')
    await loadTemplates()
  } catch (error) {
    console.error('设置失败:', error)
    showToast('设置失败')
  }
}

const handleEditTemplate = (template) => {
  // TODO: 跳转到模板编辑页面或打开编辑弹窗
  showToast('编辑模板功能开发中')
}

const getPrinterTypeText = (type) => {
  const typeMap = {
    thermal: '热敏打印机',
    dot_matrix: '针式打印机',
    laser: '激光打印机'
  }
  return typeMap[type] || type
}

const getTemplateTypeText = (type) => {
  const typeMap = {
    order_receipt: '订单小票',
    kitchen_order: '厨房单',
    delivery: '外卖单',
    invoice: '发票'
  }
  return typeMap[type] || type
}
</script>

<style lang="scss" scoped>
@use '../styles/variables' as *;

.printer-settings-page {
  min-height: 100vh;
  background: $background-color;
  padding: 10px;

  .printer-list,
  .template-list {
    margin-bottom: 20px;
  }

  .printer-item {
    background: white;
    border-radius: $border-radius-lg;
    padding: 15px;
    margin-bottom: 10px;

    .printer-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;

      .printer-info {
        h4 {
          margin: 0 0 5px 0;
          font-size: $font-size-md;
          color: $text-color;
        }

        p {
          margin: 0;
          font-size: $font-size-sm;
          color: $text-color-light;
        }
      }
    }

    .printer-details {
      .detail-row {
        display: flex;
        align-items: center;
        margin-bottom: 8px;
        font-size: $font-size-sm;
        color: $text-color-light;

        .van-icon {
          margin-right: 5px;
          width: 16px;
        }

        &:last-child {
          margin-bottom: 0;
        }
      }
    }

    .printer-actions {
      margin-top: 12px;
      display: flex;
      gap: 10px;
    }
  }

  .template-item {
    background: white;
    border-radius: $border-radius-lg;
    padding: 15px;
    margin-bottom: 10px;
    cursor: pointer;

    .template-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;

      .template-info {
        h4 {
          margin: 0 0 8px 0;
          font-size: $font-size-md;
          color: $text-color;
        }
      }
    }

    .template-preview {
      background: #f9f9f9;
      padding: 10px;
      border-radius: $border-radius;
      font-family: 'Courier New', monospace;
      font-size: $font-size-xs;
      color: $text-color-light;

      .preview-text {
        white-space: pre-wrap;
        line-height: 1.6;
      }
    }
  }

  .printer-form-popup {
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
    }
  }
}
</style>

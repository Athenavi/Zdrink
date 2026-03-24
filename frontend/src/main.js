import {createApp} from 'vue'
import {createPinia} from 'pinia'
import App from './App.vue'
import router from './router'
import {useUserStore} from './stores/user'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'vant/lib/index.css'
import './styles/variables.scss'
import './styles/global.scss'
// 在移动端模拟 touch 事件
import '@vant/touch-emulator'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(ElementPlus)
app.use(router)

// 初始化用户信息（如果有 token）
const userStore = useUserStore()
userStore.initUser().then(() => {
  console.log('用户初始化完成:', userStore.isLoggedIn ? '已登录' : '未登录')
})

app.mount('#app')
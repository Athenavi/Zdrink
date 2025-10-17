import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import vant from 'vant'
import 'vant/lib/index.css'
import './styles/global.scss'

// 在移动端模拟 touch 事件
import '@vant/touch-emulator'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(vant)

app.mount('#app')
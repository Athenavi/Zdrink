import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user'

const routes = [
  {
    path: '/',
    redirect: '/home'
  },
  {
    path: '/home',
    name: 'Home',
    component: () => import('../views/Home.vue'),
    meta: { title: 'Zdrink点餐' }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { title: '登录', noAuth: true }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/Register.vue'),
    meta: { title: '注册', noAuth: true }
  },
  {
    path: '/shop/:shopId',
    name: 'Shop',
    component: () => import('../views/Shop.vue'),
    meta: { title: '店铺详情' }
  },
  {
    path: '/menu/:shopId',
    name: 'Menu',
    component: () => import('../views/Menu.vue'),
    meta: { title: '菜单' }
  },
  {
    path: '/product/:productId',
    name: 'Product',
    component: () => import('../views/Product.vue'),
    meta: { title: '商品详情' }
  },
  {
    path: '/cart',
    name: 'Cart',
    component: () => import('../views/Cart.vue'),
    meta: { title: '购物车' }
  },
  {
    path: '/order/create',
    name: 'OrderCreate',
    component: () => import('../views/OrderCreate.vue'),
    meta: { title: '确认订单' }
  },
  {
    path: '/order/:orderId',
    name: 'OrderDetail',
    component: () => import('../views/OrderDetail.vue'),
    meta: { title: '订单详情' }
  },
  {
    path: '/orders',
    name: 'Orders',
    component: () => import('../views/Orders.vue'),
    meta: { title: '我的订单' }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('../views/Profile.vue'),
    meta: { title: '个人中心' }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/NotFound.vue'),
    meta: { title: '页面不存在' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const userStore = useUserStore()

  // 设置页面标题
  if (to.meta.title) {
    document.title = to.meta.title
  }

  // 检查是否需要登录
  if (!to.meta.noAuth && !userStore.isLoggedIn) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
  } else {
    next()
  }
})

export default router
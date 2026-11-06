import { createRouter, createWebHistory } from 'vue-router'

import SiteLayout from '../layouts/SiteLayout.vue'
import AuthView from '../views/AuthView.vue'
import HomeView from '../views/HomeView.vue'
import ProductDetailView from '../views/ProductDetailView.vue'
import ProductListView from '../views/ProductListView.vue'
import MyProductsView from '../views/MyProductsView.vue'
import ProfileView from '../views/ProfileView.vue'
import PublishProductView from '../views/PublishProductView.vue'
import FavoritesView from '../views/FavoritesView.vue'
import MessagesView from '../views/MessagesView.vue'
import OrdersView from '../views/OrdersView.vue'
import ReportsView from '../views/ReportsView.vue'
import AdminView from '../views/AdminView.vue'
import AddressesView from '../views/AddressesView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    {
      path: '/',
      component: SiteLayout,
      children: [
        { path: '', name: 'home', component: HomeView, meta: { title: '首页' } },
        { path: 'products', name: 'products', component: ProductListView, meta: { title: '商品列表' } },
        { path: 'my-products', name: 'my-products', component: MyProductsView, meta: { title: '我发布的', requiresAuth: true } },
        {
          path: 'products/:id',
          name: 'product-detail',
          component: ProductDetailView,
          props: route => ({ id: String(route.params.id) }),
          meta: { title: '商品详情' },
        },
        { path: 'login', name: 'login', component: AuthView, props: { mode: 'login' }, meta: { title: '登录' } },
        { path: 'register', name: 'register', component: AuthView, props: { mode: 'register' }, meta: { title: '注册' } },
        { path: 'publish', name: 'publish', component: PublishProductView, meta: { title: '发布商品', requiresAuth: true } },
        { path: 'profile', name: 'profile', component: ProfileView, meta: { title: '个人中心', requiresAuth: true } },
        { path: 'addresses', name: 'addresses', component: AddressesView, meta: { title: '收货地址', requiresAuth: true } },
        {
          path: 'messages',
          name: 'messages',
          component: MessagesView,
          meta: { title: '私聊模块', requiresAuth: true },
        },
        {
          path: 'orders',
          name: 'orders',
          component: OrdersView,
          meta: { title: '订单模块', requiresAuth: true },
        },
        {
          path: 'favorites',
          name: 'favorites',
          component: FavoritesView,
          meta: { title: '收藏模块', requiresAuth: true },
        },
        {
          path: 'reports',
          name: 'reports',
          component: ReportsView,
          meta: { title: '举报中心', requiresAuth: true },
        },
        {
          path: 'admin',
          name: 'admin',
          component: AdminView,
          meta: { title: '管理后台', requiresAuth: true },
        },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !localStorage.getItem('auth-token')) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
})

router.afterEach(to => {
  document.title = to.meta.title ? `${to.meta.title} - 校园闲置交易` : '校园闲置交易'
})

export default router

import { request } from './http'

import type {
  ChatMessage,
  ChatSession,
  CategoryNode,
  FavoriteProduct,
  LoginResponse,
  Order,
  PageResult,
  Product,
  Review,
  Report,
  ReturnRequest,
  ShippingAddress,
  UserProfile,
} from '@/types/api'

export interface ProductQuery {
  categoryId?: number | ''
  keyword?: string
  status?: number | ''
  sellerId?: number | ''
  minPrice?: number | ''
  maxPrice?: number | ''
  sortType?: 'latest' | 'hot' | ''
  pageNo?: number
  pageSize?: number
}

export interface ProductCreatePayload {
  categoryId: number
  title: string
  price: string
  stock?: number
  originalPrice?: string
  description?: string
  coverImage?: string
  exchangeType?: number
  deliveryMethod?: number
  location?: string
  contactPhone?: string
}

export interface ProductUpdatePayload extends Partial<ProductCreatePayload> {}

export interface RegisterPayload {
  username: string
  password: string
  nickname: string
  phone?: string
  studentNo?: string
}

export interface LoginPayload {
  username: string
  password: string
}

export interface UserUpdatePayload {
  nickname?: string
  phone?: string
  avatar?: string
  studentNo?: string
  gender?: number | ''
  major?: string
  grade?: string
}

export interface PasswordPayload {
  oldPassword: string
  newPassword: string
}

export interface AddressPayload {
  receiverName: string
  receiverPhone: string
  province: string
  city: string
  district: string
  detail: string
  isDefault?: boolean
}

export async function fetchCategories() {
  return request<CategoryNode[]>('/api/categories')
}

export async function fetchProducts(query: ProductQuery) {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value))
    }
  })
  return request<PageResult<Product>>(`/api/products?${params.toString()}`)
}

export async function fetchProduct(id: number | string) {
  return request<Product>(`/api/products/${id}`)
}

export async function createProduct(payload: ProductCreatePayload) {
  return request<Product>('/api/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateProduct(id: number | string, payload: ProductUpdatePayload) {
  return request<Product>(`/api/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function toggleOnSale(id: number | string, onSale: boolean) {
  return request<void>(`/api/products/${id}/${onSale ? 'on-sale' : 'off-sale'}`, {
    method: 'PUT',
  })
}

export async function uploadProductImage(
  id: number | string,
  file: File,
  cover?: boolean,
  sort?: number,
) {
  const formData = new FormData()
  formData.set('file', file)
  if (cover !== undefined) {
    formData.set('cover', String(cover))
  }
  if (sort !== undefined) {
    formData.set('sort', String(sort))
  }
  return request<{ id: number; url: string }>(`/api/products/${id}/images`, {
    method: 'POST',
    body: formData,
  })
}

export async function login(payload: LoginPayload) {
  return request<LoginResponse>('/api/users/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function register(payload: RegisterPayload) {
  return request<UserProfile>('/api/users/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function fetchCurrentUser() {
  return request<UserProfile>('/api/users/me')
}

export async function updateCurrentUser(payload: UserUpdatePayload) {
  return request<UserProfile>('/api/users/me', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function changePassword(payload: PasswordPayload) {
  return request<void>('/api/users/me/password', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function fetchAddresses() {
  return request<ShippingAddress[]>('/api/addresses')
}

export async function createAddress(payload: AddressPayload) {
  return request<ShippingAddress>('/api/addresses', { method: 'POST', body: JSON.stringify(payload) })
}

export async function updateAddress(id: number | string, payload: AddressPayload) {
  return request<ShippingAddress>(`/api/addresses/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export async function deleteAddress(id: number | string) {
  return request<void>(`/api/addresses/${id}`, { method: 'DELETE' })
}

export async function setDefaultAddress(id: number | string) {
  return request<ShippingAddress>(`/api/addresses/${id}/default`, { method: 'PUT' })
}

export async function favoriteProduct(productId: number | string) {
  return request<void>(`/api/favorites/${productId}`, { method: 'POST' })
}

export async function unfavoriteProduct(productId: number | string) {
  return request<void>(`/api/favorites/${productId}`, { method: 'DELETE' })
}

export async function fetchFavorites(pageNo = 1, pageSize = 12) {
  return request<PageResult<FavoriteProduct>>(`/api/favorites?pageNo=${pageNo}&pageSize=${pageSize}`)
}

export interface OrderQuery {
  status?: number | ''
  role?: 'buyer' | 'seller' | ''
  pageNo?: number
  pageSize?: number
}

function queryString(query: object) {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value))
    }
  })
  return params.toString()
}

export async function fetchOrders(query: OrderQuery) {
  const suffix = queryString(query)
  return request<PageResult<Order>>(`/api/orders${suffix ? `?${suffix}` : ''}`)
}

export async function createOrder(
  productId: number | string,
  idempotencyKey: string,
  addressId?: number | string | null,
  quantity = 1,
) {
  return request<Order>('/api/orders', {
    method: 'POST',
    body: JSON.stringify({
      productId: Number(productId),
      idempotencyKey,
      addressId: addressId ? Number(addressId) : undefined,
      quantity,
    }),
  })
}

export async function payOrder(orderId: number | string) {
  return request<Order>(`/api/orders/${orderId}/pay`, { method: 'POST' })
}

export interface AlipayPayment {
  orderNo: string
  outTradeNo: string
  channel: string
  payMethod: string
  amount: string | number
  formHtml: string
}

export interface AlipayPaymentStatus {
  orderNo: string
  tradeNo: string | null
  channel: string
  amount: string | number
  paid: boolean
  orderStatus: number | null
  orderStatusText: string | null
  paidTime: string | null
  dealTime: string | null
}

export async function createAlipayPayment(orderId: number | string) {
  return request<AlipayPayment>(`/api/payments/alipay/pay/${orderId}`, { method: 'POST' })
}

export async function fetchAlipayPaymentStatus(orderNo: string) {
  return request<AlipayPaymentStatus>(`/api/payments/alipay/status/${encodeURIComponent(orderNo)}`)
}

export async function confirmOrder(orderId: number | string) {
  return request<Order>(`/api/orders/${orderId}/confirm`, { method: 'POST' })
}

export async function finishOrder(orderId: number | string) {
  return request<Order>(`/api/orders/${orderId}/finish`, { method: 'POST' })
}

export async function cancelOrder(orderId: number | string, reason?: string) {
  return request<Order>(`/api/orders/${orderId}/cancel`, {
    method: 'POST',
    body: JSON.stringify(reason ? { reason } : {}),
  })
}

export async function createReturnRequest(
  orderId: number | string,
  payload: { reason: string; description?: string },
) {
  return request<ReturnRequest>(`/api/orders/${orderId}/return-requests`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function approveReturnRequest(returnRequestId: number | string, remark?: string) {
  return request<ReturnRequest>(`/api/orders/return-requests/${returnRequestId}/approve`, {
    method: 'POST',
    body: JSON.stringify(remark ? { remark } : {}),
  })
}

export async function rejectReturnRequest(returnRequestId: number | string, remark?: string) {
  return request<ReturnRequest>(`/api/orders/return-requests/${returnRequestId}/reject`, {
    method: 'POST',
    body: JSON.stringify(remark ? { remark } : {}),
  })
}

export async function completeReturnRequest(returnRequestId: number | string, remark?: string) {
  return request<ReturnRequest>(`/api/orders/return-requests/${returnRequestId}/complete`, {
    method: 'POST',
    body: JSON.stringify(remark ? { remark } : {}),
  })
}

export async function createChatSession(productId: number | string) {
  return request<ChatSession>('/api/chat/sessions', {
    method: 'POST',
    body: JSON.stringify({ productId: Number(productId) }),
  })
}

export async function fetchChatSessions(pageNo = 1, pageSize = 30) {
  return request<PageResult<ChatSession>>(`/api/chat/sessions?pageNo=${pageNo}&pageSize=${pageSize}`)
}

export async function fetchChatMessages(sessionId: number | string, pageNo = 1, pageSize = 100) {
  return request<PageResult<ChatMessage>>(
    `/api/chat/sessions/${sessionId}/messages?pageNo=${pageNo}&pageSize=${pageSize}`,
  )
}

export async function markChatRead(sessionId: number | string) {
  return request<void>(`/api/chat/sessions/${sessionId}/read`, { method: 'PUT' })
}

export interface ReviewCreatePayload {
  rating: number
  content?: string
}

export async function fetchProductReviews(productId: number | string, pageNo = 1, pageSize = 20) {
  return request<PageResult<Review>>(`/api/reviews/products/${productId}?pageNo=${pageNo}&pageSize=${pageSize}`)
}

export async function createReview(orderId: number | string, payload: ReviewCreatePayload) {
  return request<Review>(`/api/reviews/orders/${orderId}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function followUpReview(reviewId: number | string, payload: Partial<ReviewCreatePayload>) {
  return request<Review>(`/api/reviews/${reviewId}/follow-up`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export interface ReportCreatePayload {
  targetType: 'product' | 'user' | 'message'
  targetId: number
  reason: string
  detail?: string
  evidenceUrls?: string
}

export interface ReportQuery {
  status?: number | ''
  targetType?: 'product' | 'user' | 'message' | ''
  pageNo?: number
  pageSize?: number
}

export async function createReport(payload: ReportCreatePayload) {
  return request<Report>('/api/reports', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function fetchMyReports(query: ReportQuery) {
  const suffix = queryString(query)
  return request<PageResult<Report>>(`/api/reports/mine${suffix ? `?${suffix}` : ''}`)
}

export interface AdminUserQuery {
  keyword?: string
  role?: number | ''
  status?: number | ''
  pageNo?: number
  pageSize?: number
}

export interface AdminOrderQuery {
  status?: number | ''
  buyerId?: number | ''
  sellerId?: number | ''
  productId?: number | ''
  orderNo?: string
  pageNo?: number
  pageSize?: number
}

export interface AdminCategory extends CategoryNode {
  status: number | null
  children: AdminCategory[]
}

export interface AdminCategoryPayload {
  parentId?: number
  name?: string
  icon?: string
  sort?: number
  status?: number
}

export async function fetchAdminProducts(query: ProductQuery) {
  const suffix = queryString(query)
  return request<PageResult<Product>>(`/api/admin/products${suffix ? `?${suffix}` : ''}`)
}

export async function auditAdminProduct(id: number | string, status: 2 | 3, auditReason?: string) {
  return request<Product>(`/api/admin/products/${id}/audit`, {
    method: 'PUT',
    body: JSON.stringify({ status, auditReason }),
  })
}

export async function fetchAdminReports(query: ReportQuery) {
  const suffix = queryString(query)
  return request<PageResult<Report>>(`/api/admin/reports${suffix ? `?${suffix}` : ''}`)
}

export async function handleAdminReport(id: number | string, status: 1 | 2 | 3, handleResult?: string) {
  return request<Report>(`/api/admin/reports/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ status, handleResult }),
  })
}

export async function fetchAdminUsers(query: AdminUserQuery) {
  const suffix = queryString(query)
  return request<PageResult<UserProfile>>(`/api/admin/users${suffix ? `?${suffix}` : ''}`)
}

export async function updateAdminUser(id: number | string, payload: Partial<UserUpdatePayload> & { role?: number; status?: number }) {
  return request<UserProfile>(`/api/admin/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function fetchAdminCategories() {
  return request<AdminCategory[]>('/api/admin/categories')
}

export async function createAdminCategory(payload: Required<AdminCategoryPayload>) {
  return request<AdminCategory>('/api/admin/categories', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateAdminCategory(id: number | string, payload: AdminCategoryPayload) {
  return request<AdminCategory>(`/api/admin/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function deleteAdminCategory(id: number | string) {
  return request<void>(`/api/admin/categories/${id}`, { method: 'DELETE' })
}

export async function fetchAdminOrders(query: AdminOrderQuery) {
  const suffix = queryString(query)
  return request<PageResult<Order>>(`/api/admin/orders${suffix ? `?${suffix}` : ''}`)
}

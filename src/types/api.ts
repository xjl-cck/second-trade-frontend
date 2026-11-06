export interface ApiResult<T> {
  code: number
  msg: string
  data: T | null
}

export interface PageResult<T> {
  records: T[]
  total: number
  current: number
  size: number
}

export interface CategoryNode {
  id: number
  parentId: number | null
  name: string
  icon: string | null
  sort: number | null
  children: CategoryNode[]
}

export interface ProductImage {
  id: number
  productId: number
  url: string
  isCover: number
  sort: number
}

export interface Product {
  id: number
  sellerId: number
  sellerNickname: string | null
  sellerAvatar: string | null
  categoryId: number | null
  title: string
  price: string | number
  stock: number
  originalPrice: string | number | null
  description: string | null
  coverImage: string | null
  exchangeType: number | null
  deliveryMethod: number | null
  location: string | null
  status: number | null
  browseCount: number | null
  favoriteCount: number | null
  contactPhone: string | null
  auditReason?: string | null
  publishedTime: string | null
  createTime: string | null
  images: ProductImage[]
}

export interface FavoriteProduct extends Omit<Product, 'images'> {}

export interface Order {
  id: number
  orderNo: string
  buyerId: number
  buyerNickname: string | null
  sellerId: number
  sellerNickname: string | null
  productId: number
  quantity: number
  productTitle: string | null
  productCoverImage: string | null
  addressId: number | null
  receiverName: string | null
  receiverPhone: string | null
  receiverAddress: string | null
  amount: string | number
  status: number | null
  statusText: string | null
  closeReason: string | null
  dealTime: string | null
  finishedTime: string | null
  createTime: string | null
  returnRequest: ReturnRequest | null
}

export interface ReturnRequest {
  id: number
  orderId: number
  reason: string
  description: string | null
  status: number
  statusText: string
  sellerRemark: string | null
  approvedTime: string | null
  completedTime: string | null
  createTime: string | null
}

export interface ShippingAddress {
  id: number
  receiverName: string
  receiverPhone: string
  province: string
  city: string
  district: string
  detail: string
  isDefault: number
}

export interface Review {
  id: number
  orderId: number
  reviewerId: number
  reviewerNickname: string | null
  reviewerAvatar: string | null
  revieweeId: number
  revieweeNickname: string | null
  rating: number
  content: string | null
  reviewType: number | null
  parentId: number | null
  createTime: string | null
}

export interface ChatSession {
  id: number
  buyerId: number
  sellerId: number
  productId: number
  productTitle: string | null
  productCoverImage: string | null
  otherUserId: number
  otherNickname: string | null
  otherAvatar: string | null
  lastMessage: string | null
  lastMessageTime: string | null
  unreadCount: number | null
  updateTime: string | null
}

export interface ChatMessage {
  id: number
  sessionId: number
  senderId: number
  receiverId: number
  msgType: number
  content: string
  readStatus: number
  sendTime: string | null
}

export interface UserProfile {
  id: number
  username: string
  nickname: string
  phone: string | null
  avatar: string | null
  studentNo: string | null
  gender: number | null
  major: string | null
  grade: string | null
  role: number | null
  status: number | null
  lastLoginTime: string | null
  createTime: string | null
}

export interface LoginResponse {
  token: string
  user: UserProfile
}

export interface Report {
  id: number
  reporterId: number
  reporterNickname: string | null
  targetType: 'product' | 'user' | 'message'
  targetId: number
  reason: string
  detail: string | null
  evidenceUrls: string | null
  status: number | null
  handlerId: number | null
  handlerNickname: string | null
  handleResult: string | null
  handleTime: string | null
  createTime: string | null
}

export function formatMoney(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return '¥0'
  }
  const n = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(n)) {
    return String(value)
  }
  return `¥${n.toFixed(2).replace(/\.00$/, '')}`
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return '--'
  }
  return value.replace('T', ' ').slice(0, 16)
}

export function statusLabel(status: number | null | undefined) {
  const map: Record<number, string> = {
    1: '正常',
    2: '上架中',
    3: '已下架',
    4: '已售出',
  }
  return map[status ?? -1] ?? '未知'
}

export function orderStatusLabel(status: number | null | undefined) {
  const map: Record<number, string> = {
    0: '待确认',
    1: '已成交',
    2: '已取消',
    3: '已完成',
  }
  return map[status ?? -1] ?? '未知状态'
}

export function exchangeTypeLabel(value: number | null | undefined) {
  return value === 1 ? '可交换' : '一口价'
}

export function deliveryMethodLabel(value: number | null | undefined) {
  const map: Record<number, string> = {
    0: '线下自提',
    1: '当面交易',
    2: '卖家配送',
  }
  return map[value ?? -1] ?? '线下协商'
}

export function genderLabel(value: number | null | undefined) {
  const map: Record<number, string> = {
    0: '未知',
    1: '男',
    2: '女',
  }
  return map[value ?? -1] ?? '未知'
}

export function reportStatusLabel(value: number | null | undefined) {
  const map: Record<number, string> = {
    0: '待处理',
    1: '已受理',
    2: '已驳回',
    3: '已关闭',
  }
  return map[value ?? -1] ?? '未知状态'
}

export function reportTargetLabel(value: string | null | undefined) {
  const map: Record<string, string> = {
    product: '商品',
    user: '用户',
    message: '消息',
  }
  return map[value ?? ''] ?? '未知对象'
}

import axios from "axios";

const getHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}`,
})

const unwrap = (res: any) => res.data?.data ?? res.data

export async function getTenant(_id?: string): Promise<any> {
  const res = await axios.get('/api/tenants/me', { headers: getHeaders() })
  return unwrap(res)
}

export async function getRoom(roomId: string): Promise<any> {
  const res = await axios.get(`/api/rooms/${roomId}`, { headers: getHeaders() })
  return unwrap(res)
}

export async function getLease(_id?: string): Promise<any> {
  const res = await axios.get('/api/leases/me', { headers: getHeaders() })
  return unwrap(res)
}

export async function getPayments(_id?: string): Promise<any[]> {
  const res = await axios.get('/api/payments/me', { headers: getHeaders() })
  const data = unwrap(res)
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.payments)) return data.payments
  return []
}

export async function getMaintenanceRequests(_id?: string): Promise<any[]> {
  const res = await axios.get('/api/maintenance/my', { headers: getHeaders() })
  const data = unwrap(res)
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.requests)) return data.requests
  return []
}

export async function getMessages(_id?: string): Promise<any[]> {
  const res = await axios.get('/api/messages/unread', { headers: getHeaders() })
  const data = unwrap(res)
  return Array.isArray(data) ? data : []
}

export async function markThreadRead(threadId: string): Promise<void> {
  await axios.patch(`/api/messages/thread/${threadId}/read`, {}, { headers: getHeaders() })
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await axios.patch(`/api/notifications/${notificationId}/read`, {}, { headers: getHeaders() })
}

export async function initiatePaypalPayment(payload: {
  tenant_id: string
  lease_id: string
  room_id: string
  amount: number
  type?: string
  period_start?: string
  period_end?: string
}): Promise<{ payment_id: string; approval_url: string; order_id: string; receipt_number: string }> {
  const res = await axios.post('/api/payments/paypal/initiate', payload, { headers: getHeaders() })
  return unwrap(res)
}

export async function recordCashPayment(payload: {
  tenant_id: string
  lease_id: string
  room_id: string
  amount: number
  type?: string
  method?: string
  reference_no?: string
  notes?: string
  period_start?: string
  period_end?: string
}): Promise<any> {
  const res = await axios.post('/api/payments/cash', payload, { headers: getHeaders() })
  return unwrap(res)
}
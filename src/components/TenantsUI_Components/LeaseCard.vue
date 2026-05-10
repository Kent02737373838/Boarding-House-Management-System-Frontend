<script setup lang="ts">
interface LeaseDetails {
  room: string
  monthlyRent: number
  leaseStart: string
  leaseEnd: string
  monthsCompleted: number
  totalMonths: number
  status: 'Active' | 'Inactive' | 'Expired'
}

defineProps<{ lease: LeaseDetails }>()

function formatCurrency(amount: number) {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}

function progressPct(completed: number, total: number) {
  if (!total) return 0
  return Math.min(100, Math.max(0, (completed / total) * 100))
}
</script>

<template>
  <div class="lc">
    <!-- Header: title + status badge on same row -->
    <div class="lc__header">
      <h2 class="lc__title">Lease details</h2>
      <span :class="['lc__badge', `lc__badge--${lease.status.toLowerCase()}`]">{{ lease.status }}</span>
    </div>

    <!-- Unified info box: Room | Star | Monthly rent -->
    <div class="lc__info-box">
      <div class="lc__info-field">
        <span class="lc__info-label">Room</span>
        <span class="lc__info-value">{{ lease.room }}</span>
      </div>
      <div class="lc__star-col">
        <span class="lc__star">&#9733;</span>
      </div>
      <div class="lc__info-field lc__info-field--right">
        <span class="lc__info-label">Monthly rent</span>
        <span class="lc__info-value">{{ formatCurrency(lease.monthlyRent) }}</span>
      </div>
    </div>

    <!-- Dates: two equal boxes -->
    <div class="lc__dates-row">
      <div class="lc__date-box">
        <span class="lc__date-label">Lease start</span>
        <span class="lc__date-value">{{ lease.leaseStart }}</span>
      </div>
      <div class="lc__date-box">
        <span class="lc__date-label">Lease end</span>
        <span class="lc__date-value">{{ lease.leaseEnd }}</span>
      </div>
    </div>

    <!-- Progress: bar first, then labels below -->
    <div class="lc__progress">
      <div class="lc__bar-track">
        <div class="lc__bar-fill" :style="{ width: `${progressPct(lease.monthsCompleted, lease.totalMonths)}%` }" />
      </div>
      <div class="lc__bar-meta">
        <span>{{ lease.leaseStart }}</span>
        <span class="lc__bar-center">{{ lease.monthsCompleted }} of {{ lease.totalMonths }} months completed</span>
        <span>{{ lease.leaseEnd }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lc {
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* Header */
.lc__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.lc__title {
  font-size: 15px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
}
.lc__badge {
  font-size: 12px;
  font-weight: 600;
  padding: 3px 12px;
  border-radius: 20px;
}
.lc__badge--active   { background: #fff7e6; color: #d97706; }
.lc__badge--inactive { background: #f5f5f5; color: #888; }
.lc__badge--expired  { background: #fff0f0; color: #c0392b; }

/* Unified info box */
.lc__info-box {
  background: #f8f7ff;
  border-radius: 10px;
  padding: 14px 16px;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 8px;
}
.lc__info-field { display: flex; flex-direction: column; gap: 4px; }
.lc__info-field--right { text-align: right; align-items: flex-end; }
.lc__info-label {
  font-size: 11px;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.lc__info-value {
  font-size: 14px;
  font-weight: 700;
  color: #111827;
}
.lc__star-col { display: flex; align-items: center; justify-content: center; }
.lc__star {
  font-size: 30px;
  color: #d946ef;
  filter: drop-shadow(0 1px 4px rgba(217,70,239,.35));
  line-height: 1;
}

/* Dates row */
.lc__dates-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.lc__date-box {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.lc__date-label {
  font-size: 11px;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.lc__date-value {
  font-size: 14px;
  font-weight: 700;
  color: #111827;
}

/* Progress bar */
.lc__progress { display: flex; flex-direction: column; gap: 6px; }
.lc__bar-track {
  height: 7px;
  background: #e9e6f5;
  border-radius: 99px;
  overflow: hidden;
}
.lc__bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #a855f7 0%, #f97316 100%);
  border-radius: 99px;
  transition: width 0.4s ease;
}
.lc__bar-meta {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #9ca3af;
}
.lc__bar-center { color: #6b7280; font-weight: 500; }
</style>
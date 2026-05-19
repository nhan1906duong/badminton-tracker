// Currency formatting helpers + penalty constant.
// Each loss incurs LOSS_PENALTY_VND.
// formatCurrency renders amounts in vi-VN locale (e.g. 30.000 VND).

export const LOSS_PENALTY_VND = 5000

export function formatCurrency(vnd: number): string {
  return new Intl.NumberFormat('vi-VN').format(vnd) + ' VND'
}

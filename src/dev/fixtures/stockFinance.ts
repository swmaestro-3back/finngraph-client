import type { FinanceGapFixture } from '@/lib/fg/financials'

const JO = 1e12

export const financeGapFixture: FinanceGapFixture = {
  quarters: [
    { year: 2024, quarter: 3, sales: 5.3 * JO, op: 0.55 * JO },
    { year: 2024, quarter: 4, sales: 5.7 * JO, op: 0.71 * JO },
    { year: 2025, quarter: 1, sales: 5.8 * JO, op: 0.85 * JO },
    { year: 2025, quarter: 2, sales: 6.0 * JO, op: 0.97 * JO },
    { year: 2025, quarter: 3, sales: 6.6 * JO, op: 1.13 * JO },
    { year: 2025, quarter: 4, sales: 6.2 * JO, op: 0.95 * JO },
    { year: 2026, quarter: 1, sales: 6.4 * JO, op: 0.78 * JO },
    { year: 2026, quarter: 2, sales: 7.0 * JO, op: 1.12 * JO },
  ],
  bps: [46230, 44390, 47400, 51760],
  currentRatio: [182.4, 165.1, 171.8, 188.6],
}

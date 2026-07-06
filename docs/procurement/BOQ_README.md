# Procurement BOQ — Excel Instructions

## Files (open directly in Excel)

| File | Purpose |
|------|---------|
| [BOQ_NPA_ECM_PROJECT.csv](./BOQ_NPA_ECM_PROJECT.csv) | NPA project line items — **single ₦350M fixed cap** |
| [BOQ_VENDOR_TCO_COMPARISON.csv](./BOQ_VENDOR_TCO_COMPARISON.csv) | Vendors at **840** and **3,000** users; NPA-ECM **same price both rows** |
| [BOQ_PAYMENT_MILESTONES.csv](./BOQ_PAYMENT_MILESTONES.csv) | Payment schedule — ₦350M covers all staff |
| [CFO_SUMMARY_ONE_PAGE.md](./CFO_SUMMARY_ONE_PAGE.md) | Board / CFO one-pager |
| [REMAINING_WORK_BACKLOG.md](./REMAINING_WORK_BACKLOG.md) | P0/P1/P2 backlog; Phase 9–11 MVP status (v1.1, June 2026) |

## Pricing model (important)

| Product | 840 users | 3,000 users |
|---------|----------:|------------:|
| **NPA-ECM project** | **₦350M** | **₦350M** (unchanged) |
| **NPA-ECM 5-yr TCO** | **₦470M – ₦550M** | **₦470M – ₦550M** (unchanged) |
| Commercial ECM | Scales with seats | **~3.6× higher** than 840 |

**840** = phased rollout reference (subset of NPA).  
**3,000** = full NPA headcount — **same NPA-ECM price**, lower **per-user** economics.

## Open in Excel

1. Excel → **File → Open** → select `.csv`
2. **Data → Text to Columns** → Delimited → **Comma**
3. Filter `BOQ_VENDOR_TCO_COMPARISON.csv` by `User_Count` (840 vs 3000) or `Price_Scales_With_Users` (Yes vs No)

## FX

**₦1,388 = $1 USD** (June 2026 mid-market)

## Related

- [Remaining Work Backlog](./REMAINING_WORK_BACKLOG.md) — itemized delivery gaps (P0/P1/P2); engineering Phase 9–11 status
- [ECM Price Comparison](./ECM_PRICE_COMPARISON.md)
- [Project Proposal](./PROJECT_PROPOSAL_AND_COST_BREAKDOWN.md)

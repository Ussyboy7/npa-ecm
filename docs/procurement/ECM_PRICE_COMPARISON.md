# ECM Price Comparison — NPA-ECM vs Top 10 Vendors

**Document version:** 1.0  
**Date:** June 2026  
**Purpose:** Financial comparison for procurement, budget justification, and board review  
**Related:** [Project Proposal](./PROJECT_PROPOSAL_AND_COST_BREAKDOWN.md) · [Feature Matrix](./ECM_COMPARISON_MATRIX.md)

---

## Important disclaimers

1. **Commercial ECM pricing is almost never public.** Figures below are **indicative ranges** from vendor list prices, partner guides, government contract price lists, and industry benchmarks (2025–2026). **Final quotes vary** by user count, modules, deployment model, negotiation, and region.
2. **Apples-to-oranges risk:** SharePoint is bundled with Microsoft 365 (email, Teams, Office). NPA-ECM is a **correspondence-first ECM** with seals, office routing, and on-prem sovereignty — not a direct SKU match.
3. **FX rate used:** **₦1,388 = $1 USD** (mid-market, June 2026). Naira amounts are rounded.
4. **NPA sizing assumptions:** **840 users** (pilot/operational rollout per project proposal) and **3,000 users** (full NPA headcount). Adjust tables if your licensed user count differs.
5. **NPA-ECM model:** **Fixed project cap ₦350M** (5-year TCO **₦470M – ₦550M**) covering **all ~3,000 NPA employees** — **no per-seat license**. The price **does not increase** whether you onboard 840 (phased rollout) or 3,000 (full headcount). Commercial vendors charge per user; their totals scale up.

**Excel-ready BOQ:** See [BOQ_NPA_ECM_PROJECT.csv](./BOQ_NPA_ECM_PROJECT.csv), [BOQ_VENDOR_TCO_COMPARISON.csv](./BOQ_VENDOR_TCO_COMPARISON.csv), [CFO Summary](./CFO_SUMMARY_ONE_PAGE.md).

---

## Executive summary — 5-year TCO at 840 vs 3,000 users

**NPA-ECM total stays the same. Commercial ECM multiplies with headcount.**

| Solution | Pricing model | **840 users** | **3,000 users** | Scales with users? |
|----------|---------------|-------------:|----------------:|:------------------:|
| **NPA-ECM** | Fixed cap + AMC | **₦470M – ₦550M** | **₦470M – ₦550M** | **No** |
| DocuWare | Per-seat SaaS | ₦2.0B – ₦3.5B | ₦11B – ₦22B | Yes |
| Box Enterprise | Per-seat cloud | ₦2.4B – ₦3.0B | ₦9.5B – ₦12B | Yes |
| Microsoft 365 E3* | Per-seat subscription | ₦2.7B – ₦3.2B | ₦11B – ₦15B | Yes |
| Laserfiche Business | Per-seat subscription | ₦2.5B – ₦4.5B | ₦25B – ₦32B | Yes |
| M-Files Enterprise | Per-seat + PS | ₦3.5B – ₦6.0B | ₦28B – ₦42B | Yes |
| OpenText | Per-seat enterprise | ₦5.0B – ₦12B | ₦15B – ₦35B | Yes |
| IBM FileNet | Per-seat / VPC | ₦6.0B – ₦15B+ | ₦28B – ₦65B+ | Yes |

\*M365 figures are **subscription licenses only** at each headcount.

> **Bottom line:** At **840 users**, NPA-ECM is typically **5–15× cheaper** than commercial ECM. At **3,000 users**, NPA-ECM is still **₦470M – ₦550M** — but commercial vendors jump to **₦10B – ₦35B+** (**20–60×** more).

---

## NPA-ECM — one price, all staff

| Item | Amount (₦) | 840 users | 3,000 users |
|------|------------|-----------|-------------|
| **Project (18 mo + 12 mo support)** | **350,000,000** | Same | Same |
| **5-year TCO (low)** | **470,000,000** | Same | Same |
| **5-year TCO (high)** | **550,000,000** | Same | Same |
| **Cost per user / 5 years** | — | ₦560K – ₦655K | **₦157K – ₦183K** |

840 is a **phased rollout subset** of the same 3,000-employee deployment — not a smaller license tier.

### Annual run-rate comparison (subscriptions)

| Vendor | **840 users / year** | **3,000 users / year** | NPA-ECM (amortized) |
|--------|---------------------:|-----------------------:|--------------------:|
| **NPA-ECM** | **~₦70M** | **~₦70M** | Fixed — no seat fee |
| Box @ $35 | ~₦490M | ~₦1.75B | — |
| M365 E3 @ $39 | ~₦546M | ~₦1.95B | — |
| Laserfiche @ $93 | ~₦1.30B | **~₦4.65B** | — |

**CFO takeaway:** One year of Laserfiche for 3,000 staff (**~₦4.65B**) ≈ **10×** NPA-ECM’s entire **5-year** budget (**~₦470M**).

---

## NPA-ECM cost structure (fixed — all NPA staff)

| Cost item | Amount (₦) | Timing | Notes |
|-----------|------------|--------|-------|
| **Total project (fixed cap)** | **350,000,000** | Months 1–18 | All ~3,000 employees; no seat license |
| Includes 12-month post-go-live support | (in above) | Months 16–28 | Bug fixes, patches, minor enhancements |
| **Optional years 3–5 AMC** (estimate) | 25,000,000 – 40,000,000 / year | Ongoing | Same range at 840 or 3,000 users |
| **5-year TCO (low)** | **~470,000,000** | | ₦350M + 4 × ₦30M AMC |
| **5-year TCO (high)** | **~550,000,000** | | ₦350M + 4 × ₦50M AMC |

**Per-user economics (total price unchanged):**

| Metric | @ 840 users | @ 3,000 users |
|--------|------------:|--------------:|
| Project per user | ₦417,000 | **₦117,000** |
| 5-year TCO per user (low) | ₦560,000 | **₦157,000** |
| 5-year TCO per user (high) | ₦655,000 | **₦183,000** |

---

## Per-vendor pricing overview

### Pricing model legend

| Model | Description |
|-------|-------------|
| **Per user/month** | Named or monthly active user subscription |
| **Per core/VPC** | Capacity-based (common for IBM, large OpenText) |
| **Fixed project** | Implementation + license bundle (NPA-ECM model) |
| **PS** | Professional services (implementation, migration, training) |

---

## 1. Microsoft SharePoint (+ Microsoft 365)

SharePoint is **not sold standalone** for most enterprises — it comes with Microsoft 365 suites.

| Plan | USD / user / month (annual) | From July 2026 | Includes |
|------|----------------------------|----------------|----------|
| Microsoft 365 E3 | $36 → **$39** | +8% | Desktop Office, SharePoint, Teams, Exchange, Intune |
| Microsoft 365 E5 | $57 → **$60** | +5% | E3 + advanced security, eDiscovery, Copilot options |
| Office 365 E3 (no desktop) | $23 → **$26** | +13% | Web apps + SharePoint |

*Sources: Microsoft licensing announcements, July 2026 pricing update.*

### NPA-scale estimate (840 users)

| Scenario | Annual license (USD) | Annual license (₦) | 5-year licenses only (₦) |
|----------|---------------------|-------------------|--------------------------|
| M365 E3 @ $39 | $393,120 | ₦546M | **₦2.73B** |
| M365 E5 @ $60 | $604,800 | ₦840M | **₦4.20B** |
| O365 E3 @ $26 | $262,080 | ₦364M | **₦1.82B** |

**Typical add-ons (not in license):**

| Item | Est. one-time (USD) | Est. (₦) |
|------|---------------------|----------|
| SharePoint implementation & migration | $150,000 – $500,000 | ₦208M – ₦694M |
| Purview / compliance (if required) | $50,000 – $200,000/yr | ₦69M – ₦278M/yr |
| Power Platform / custom workflows | $100,000 – $400,000 | ₦139M – ₦555M |

**5-year TCO (E3 + moderate implementation):** **₦3.2B – ₦4.5B**

| vs NPA-ECM | Verdict |
|------------|---------|
| License cost alone | **~8× NPA 5-year TCO** in year 1 |
| Correspondence/seal fit | Weak — requires heavy customization |
| Best when | NPA already standardized on Microsoft 365 |

---

## 2. OpenText Content Suite

| Metric | Range |
|--------|-------|
| **Per-user list (enterprise)** | **$50 – $120+ / user / month** (module-dependent) |
| **Implementation** | **$100,000 – $1,500,000+** (250–1,000+ users) |
| **Annual maintenance** | ~18–23% of license (typical enterprise) |
| **Pricing transparency** | Quote only |

*Sources: Vendr marketplace analysis, ITQlick, Washington state contract price list samples.*

### NPA-scale estimate (840 users)

| Component | Low | High |
|-----------|-----|------|
| Annual subscription @ $60/user | $604,800 (₦840M) | @ $100/user → $1,008,000 (₦1.40B) |
| Implementation (one-time) | $300,000 (₦417M) | $1,200,000 (₦1.67B) |
| 5-year TCO | **₦5.0B** | **₦12.0B** |

| vs NPA-ECM | Verdict |
|------------|---------|
| Cost | **10–22× higher** (5-year) |
| Strength | Records management, compliance at scale |
| Weakness | Cost, complexity, long implementation |

---

## 3. IBM FileNet / Cloud Pak for Business Automation

| Metric | Range |
|--------|-------|
| **Licensing model** | VPC (Virtual Processor Core) — **$2,000 – $3,500 / VPC / month** |
| **Per-user (legacy AU metrics)** | ~$1,055 / authorized user / year (list, before discount) |
| **Typical enterprise annual** | **$200,000 – $2,000,000+** |
| **Implementation** | **9–24 months**; **$200K – $2M+** |

*Sources: IBM Passport Advantage price list (partner), TechVendorIndex, IBM docs.*

### NPA-scale estimate (840 users)

| Approach | Annual (USD) | Annual (₦) | 5-year TCO (₦) |
|----------|-------------|------------|----------------|
| VPC-based (~8–15 VPC) | $192,000 – $630,000 | ₦267M – ₦874M | **₦6B – ₦12B** (incl. PS) |
| Per-user @ ~$100/mo equiv. | ~$1,008,000 | ₦1.40B | **₦8B – ₦15B** |

| vs NPA-ECM | Verdict |
|------------|---------|
| Cost | Among the **most expensive** options |
| Strength | Complex case management at national scale |
| Weakness | Skills scarcity, long time-to-value |

---

## 4. Hyland OnBase

| Metric | Range |
|--------|-------|
| **Published per-user** | **Not published** (quote only) |
| **Industry estimate** | **$80 – $200+ / user / month** (enterprise) |
| **Implementation** | **$150,000 – $800,000+** |
| **Timeline** | 12–24 months typical |

### NPA-scale estimate (840 users)

| Scenario | 5-year TCO (₦) |
|----------|----------------|
| Conservative @ $80/user/mo + $300K PS | **₦4.0B – ₦5.5B** |
| Enterprise @ $150/user/mo + $800K PS | **₦7.0B – ₦10.0B** |

| vs NPA-ECM | Verdict |
|------------|---------|
| Cost | **8–15× higher** |
| Strength | Process + capture; closest commercial analog to NPA workflows |
| Weakness | Partner-dependent customization cost |

---

## 5. Laserfiche

| Tier | USD / user / month (annual) | Notes |
|------|----------------------------|-------|
| Cloud Starter | ~$53 | Basic DM; min users apply |
| Cloud Professional | ~$73 | Workflow + forms |
| Cloud Business | ~$93 | **Records management** |
| Enterprise | Custom | Large deployments |

*Source: Laserfiche cloud pricing benchmarks (2026).*

### NPA-scale estimate (840 users — Business tier for records)

| Component | Calculation | Amount |
|-----------|-------------|--------|
| Annual licenses @ $93 | 840 × $93 × 12 | **$937,440 / yr (₦1.30B)** |
| Implementation | $100K – $400K | ₦139M – ₦555M |
| **5-year TCO** | | **₦2.5B – ₦4.5B** |

| vs NPA-ECM | Verdict |
|------------|---------|
| Cost | **5–9× higher** |
| Strength | Public-sector friendly; records at Business tier |
| Weakness | Per-seat cost scales painfully at 840 users |

---

## 6. M-Files

| Tier | USD / user / month | Notes |
|------|-------------------|-------|
| Essentials | **$65** (published) | Metadata DM foundation |
| Enterprise | **Quote only** | Governance, advanced AI, federation |
| Implementation | **$7,000 – $35,000+** (scales with scope) | Partner guides |

*Source: m-files.com editions page, partner implementation guides.*

### NPA-scale estimate (840 users)

| Scenario | Annual (USD) | 5-year TCO (₦) |
|----------|-------------|----------------|
| Essentials @ $65 | $655,200 | **₦2.8B – ₦3.5B** |
| Enterprise @ ~$120 (est.) | $1,209,600 | **₦5.5B – ₦7.0B** |

| vs NPA-ECM | Verdict |
|------------|---------|
| Cost | **6–12× higher** at enterprise tier |
| Strength | Metadata search, M365 native |
| Weakness | Not correspondence/office-routing native |

---

## 7. Box (Enterprise)

| Tier | USD / user / month (annual) | Min users |
|------|----------------------------|-----------|
| Business | $15 | 3 |
| Business Plus | $25 | 3 |
| **Enterprise** | **$35** | 3 |
| Enterprise Plus | ~$50 | Quote |
| Enterprise Advanced | Custom (+30–40% over EP) | Quote |

*Source: Box pricing, PCMag/CostBench 2026.*

### NPA-scale estimate (840 users — Enterprise)

| Component | Amount |
|-----------|--------|
| Annual @ $35 | $352,800 (**₦490M/yr**) |
| Implementation / governance add-ons | $50K – $200K |
| **5-year TCO** | **₦2.4B – ₦3.0B** |

| vs NPA-ECM | Verdict |
|------------|---------|
| Cost | **5–6× higher** (licenses dominate) |
| Strength | Simple cloud sharing, fast rollout |
| Weakness | Weak structured correspondence / seal workflows |

---

## 8. DocuWare

| Model | USD / user / month | Notes |
|-------|-------------------|-------|
| Cloud (volume sliding) | **$25 – $71** | UK list £20–£57; all features in tier |
| Workflow-only licenses | ~$9.20 | Limited task users |
| Implementation | Partner-led | Bundle-based cloud tiers |

*Source: DocuWare FAQ, CheckThat.ai pricing guide.*

### NPA-scale estimate (840 users @ $40 avg)

| Component | Amount |
|-----------|--------|
| Annual licenses | $403,200 (**₦560M/yr**) |
| Implementation | $80K – $300K |
| **5-year TCO** | **₦2.0B – ₦3.5B** |

| vs NPA-ECM | Verdict |
|------------|---------|
| Cost | **4–7× higher** |
| Strength | Fast time-to-value, workflow included |
| Weakness | Not built for NPA office hierarchy / seals |

---

## 9. Adobe Experience Manager (AEM)

| Metric | Range |
|--------|-------|
| **Licensing** | **Quote only** — often **$100K – $1M+ / year** base |
| **Model** | Capacity, environments (author/publish), modules (Assets, Forms) |
| **Implementation** | **$200K – $2M+** |
| **Best fit** | Marketing DAM, customer-facing content — not internal memo ECM |

### NPA-scale estimate

| 5-year TCO (₦) | **₦4.0B – ₦10.0B+** |

| vs NPA-ECM | Verdict |
|------------|---------|
| Cost | **8–20× higher** |
| Fit for NPA internal correspondence | **Poor** — wrong product category |

---

## 10. Alfresco (Hyland) Enterprise

| Metric | Range |
|--------|-------|
| **Model** | Subscription + services; open-source Community edition exists (unsupported) |
| **Enterprise estimate** | **$40 – $100+ / user / month** equivalent |
| **Implementation** | **$100K – $500K+** |

### NPA-scale estimate (840 users)

| 5-year TCO (₦) | **₦2.0B – ₦5.0B** |

| vs NPA-ECM | Verdict |
|------------|---------|
| Cost | **4–10× higher** |
| Strength | Developer control, flexible platform |
| Weakness | Requires strong in-house engineering |

---

## Side-by-side: annual subscription comparison (840 users)

*License/subscription only — excludes implementation, training, infrastructure.*

| Vendor | Low $/user/mo | High $/user/mo | Annual low (₦) | Annual high (₦) |
|--------|---------------|----------------|----------------|-----------------|
| **NPA-ECM** (amortized) | ~$7 | ~$8 | **₦70M**¹ | **₦80M**¹ |
| DocuWare | $25 | $71 | ₦349M | ₦991M |
| Box Enterprise | $35 | $50 | ₦489M | ₦699M |
| Microsoft 365 E3 | $39 | $60 | ₦545M | ₦839M |
| M-Files Essentials | $65 | $65 | ₦909M | ₦909M |
| Laserfiche Business | $93 | $93 | ₦1.30B | ₦1.30B |
| OpenText (est.) | $50 | $120 | ₦699M | ₦1.68B |
| M-Files Enterprise (est.) | $100 | $150 | ₦1.39B | ₦2.09B |
| OnBase (est.) | $80 | $200 | ₦1.11B | ₦2.78B |
| IBM FileNet (est.) | $100 | $200+ | ₦1.39B | ₦2.78B+ |

¹ NPA-ECM: ₦350M project ÷ 5 years ≈ ₦70M/year equivalent (excludes optional AMC).

---

## Side-by-side: implementation & hidden costs

| Cost type | Typical commercial ECM | NPA-ECM (proposal) |
|-----------|------------------------|-------------------|
| **Initial implementation** | $100K – $2M+ (₦139M – ₦2.78B) | **Included in ₦350M** |
| **Infrastructure / on-prem** | Often extra or cloud-hosted | **₦65M included** |
| **Port rollout & training** | Often extra PS | **₦60M included** (§3 + §4) |
| **Annual maintenance** | 18–23% of license | **12 months included**; then optional AMC |
| **Per-seat annual increase** | 5–12% typical (e.g. Microsoft 2026) | **None** (no per-seat tax) |
| **Customization / NPA workflows** | $200K – $1M+ SOW | **Core platform pre-built** |
| **Executive seal & verify portal** | Custom build | **Included** |
| **Vendor lock-in renewal** | High negotiation risk | **Source code ownership** (NPA/proprietary) |

---

## 10-year horizon (optional)

| Solution | 10-year TCO (₦) | Notes |
|----------|-----------------|-------|
| **NPA-ECM** | **₦650M – ₦850M** | ₦350M + 8–9 yrs AMC @ ₦30–50M |
| **Laserfiche Business** | **₦5.5B – ₦8.0B** | Licenses only; PS extra |
| **Microsoft 365 E3** | **₦5.5B – ₦6.5B** | Licenses only; no implementation |
| **OpenText** | **₦12B – ₦25B** | Enterprise national deployment |

> Per-seat licensing **compounds**. A ₦500M/year subscription becomes **₦5B over 10 years** before inflation and true-ups.

---

## Value comparison — not just price

Price is only one axis. For NPA’s use case:

| Capability | NPA-ECM @ ₦350M | Typical $400K–$1M/yr ECM |
|------------|-----------------|--------------------------|
| Office-based MD/ED/GM routing | ✅ Native | 🔧 Custom PS |
| Executive digital seal + public verify | ✅ Native | ❌ / custom |
| On-prem / sovereign hosting | ✅ Designed for it | 🟡 Often cloud-pushed |
| FOIA / physical records tracking | ✅ Built | 🟡 Add-on |
| Per-seat cost at 3,000 users | ✅ **Same ₦350M cap** | ❌ **3.6×+ vs 840** |
| M365 / Teams integration | ❌ | ✅ SharePoint |
| Mature retention / legal hold | 🔵 In proposal | ✅ OpenText/Laserfiche |
| SSO / Active Directory | 🔵 In proposal | ✅ Standard |

**Procurement insight:** Commercial ECM looks cheaper at **50 users** and expensive at **500+**. NPA’s **3,000-employee** scale is where **fixed-cap NPA-ECM wins most decisively** — vendors multiply cost per seat; NPA-ECM does not.

---

## Recommended procurement presentation slide

### Option A — NPA-ECM (proposed)
- **₦350M** fixed — **all 3,000 NPA staff**, no per-seat fee
- **₦470M – ₦550M** 5-year TCO (same at 840 or 3,000 users)
- Sovereign on-prem; correspondence-native

### Option B — Commercial ECM (Laserfiche Business)
- **840 users:** ~₦1.3B/year → **~₦3B** over 5 years
- **3,000 users:** ~₦4.65B/year → **~₦25B+** over 5 years
- **Up to 50×** more than NPA-ECM at full headcount

### Option C — Microsoft 365 + SharePoint customization
- **3,000 users:** ~₦1.95B/year licenses + ₦200M–₦700M customization
- **~₦11B – ₦15B** 5-year TCO

---

## Sources & references

| Source | Used for |
|--------|----------|
| [Microsoft 365 pricing update (July 2026)](https://www.microsoft.com/en-us/licensing/news/2026-m365-packaging-pricing-updates) | SharePoint/M365 per-user |
| [M-Files editions](https://www.m-files.com/editions/) | Essentials $65/seat |
| [DocuWare pricing FAQ](https://start.docuware.com/en-gb/faq/docuware_pricing) | Per-user sliding scale |
| [Laserfiche pricing benchmarks](https://checkthat.ai/brands/laserfiche/pricing) | Tiered cloud plans |
| [Box pricing](https://costbench.com/software/document-management/box/) | Enterprise $35/user |
| [Vendr OpenText analysis](https://www.vendr.com/marketplace/opentext) | Implementation ranges |
| [IBM FileNet price list (partner)](https://www.enchoice.com/Portals/0/Documents/enChoice-DIR-CPO-5224-itemized-price-list-MSRP.pdf) | Authorized user metrics |
| [Wise USD/NGN](https://wise.com/us/currency-converter/usd-to-ngn-rate) | FX conversion |
| NPA [Project Proposal](./PROJECT_PROPOSAL_AND_COST_BREAKDOWN.md) | ₦350M budget, 840 users |

---

## Document control

| Field | Value |
|-------|-------|
| Classification | Internal — Procurement / Finance |
| FX rate | ₦1,388 = $1 USD (June 2026) |
| User assumption | 840 (phased) and 3,000 (full NPA) — **NPA-ECM price identical at both** |
| Next review | After vendor RFP responses received |

---

*All third-party prices are indicative. Request formal quotes from authorized vendors before budget approval. NPA-ECM figures reflect the approved ₦350,000,000 project cap in the NPA ECM proposal.*

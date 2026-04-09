import{u as Q,r as c,j as e,i as F}from"./vendor-DGf4ukVm.js";import{b as X}from"./vendor-query-CH6xEl-b.js";import{o as J,p as Z,q as ee}from"./pages-boards-C8RsFNEc.js";import{u as te}from"./pages-notebooks-BNPBBBE_.js";import{O as w,ao as ne,ap as ae,X as re,aq as k,b as B,ar as x,as as L,at as oe,au as ie,av as se,aa as ce,aw as de,w as le,ax as pe,ay as me,az as ue,aA as ye,aB as he,aC as ge,aD as ve,W as fe,aE as be,aF as we,aG as ke,aH as xe,aI as Ce,J as _e,a3 as Se,r as Ae,aJ as Re,ai as Pe,V as Me,y as Te,k as Ne,N as je,aK as Ie,E as Fe,aL as Be,aM as Le,i as Ee,j as Oe,ab as ze,l as $e,G as De,aN as We,aO as Ve,al as Ke,e as E}from"./vendor-icons-Dfv43Rrw.js";import"./vendor-ui-DNU0vQe8.js";const qe=[{key:"all",label:"All"},{key:"strategy",label:"Strategy"},{key:"intelligence",label:"Intelligence"},{key:"marketing",label:"Marketing"},{key:"finance",label:"Finance"},{key:"research",label:"Research"}],C=[{id:"strategy-competitive-analysis",title:"Competitive Analysis",description:"Deep-dive into competitor positioning, strengths, and gaps",category:"strategy",icon:"Sparkles",cells:[{type:"markdown",content:`# Competitive Analysis

Use this notebook to map the competitive landscape, identify differentiation opportunities, and track competitor moves over time.`},{type:"markdown",content:`## Competitors

List your primary and secondary competitors below. Include direct competitors (same product category) and indirect competitors (alternative solutions).

| Competitor | Category | Est. Revenue | Key Differentiator |
|-----------|----------|-------------|--------------------|
| | | | |
| | | | |`},{type:"ai-prompt",content:"Analyze the competitive landscape for [company] in [industry]. Identify the top 5-7 competitors, their market positioning, pricing tiers, key features, and recent strategic moves. Highlight gaps and whitespace opportunities."},{type:"code",content:`# Competitor comparison data table
import pandas as pd

competitors = pd.DataFrame({
    'Company': ['Competitor A', 'Competitor B', 'Competitor C'],
    'Market_Share_Pct': [25, 18, 12],
    'Pricing_Tier': ['Enterprise', 'Mid-Market', 'SMB'],
    'NPS_Score': [42, 38, 55],
    'YoY_Growth_Pct': [15, 22, 35]
})

print(competitors.to_markdown(index=False))`},{type:"markdown",content:`## Key Takeaways

- **Biggest threat:**
- **Biggest opportunity:**
- **Recommended actions:**`}]},{id:"strategy-market-entry",title:"Market Entry Strategy",description:"Framework for evaluating and planning entry into a new market",category:"strategy",icon:"Globe",cells:[{type:"markdown",content:`# Market Entry Strategy

Structured analysis for entering a new geographic or vertical market. Covers market attractiveness, entry barriers, and go-to-market sequencing.`},{type:"ai-prompt",content:"Provide a market overview for [target market/geography]. Include market size (TAM), growth rate, key players, regulatory environment, and cultural considerations that affect B2B SaaS adoption."},{type:"markdown",content:`## Entry Barriers

| Barrier | Severity (1-5) | Mitigation Strategy |
|--------|---------------|---------------------|
| Regulatory compliance | | |
| Local competition | | |
| Distribution channels | | |
| Brand awareness | | |
| Talent availability | | |`},{type:"ai-prompt",content:"Outline a phased go-to-market plan for [company] entering [target market]. Include: Phase 1 (validation, 0-3 months), Phase 2 (early traction, 3-9 months), Phase 3 (scale, 9-18 months). For each phase, specify channels, partnerships, hiring, and success metrics."},{type:"markdown",content:`## Decision Matrix

Go / No-Go criteria:
- [ ] Market size exceeds $[X]M
- [ ] Regulatory path is clear
- [ ] At least 2 potential channel partners identified
- [ ] Payback period under 18 months`}]},{id:"strategy-swot",title:"SWOT Analysis",description:"Structured strengths, weaknesses, opportunities, and threats assessment",category:"strategy",icon:"Target",cells:[{type:"markdown",content:`# SWOT Analysis

A comprehensive assessment of internal strengths/weaknesses and external opportunities/threats for [company/product/initiative].`},{type:"ai-prompt",content:"Identify the top 5 strengths of [company] in [industry]. Consider brand equity, technology, talent, IP, distribution, and customer relationships. Rank them by strategic importance."},{type:"ai-prompt",content:"Identify the top 5 weaknesses of [company]. Consider resource constraints, technical debt, market perception, talent gaps, and operational inefficiencies. Be candid and specific."},{type:"ai-prompt",content:"Identify the top 5 market opportunities for [company]. Consider emerging trends, underserved segments, regulatory changes, technology shifts, and partnership possibilities."},{type:"ai-prompt",content:"Identify the top 5 threats facing [company]. Consider competitive moves, market shifts, regulatory risks, macroeconomic factors, and technology disruption."},{type:"markdown",content:`## Strategic Implications

**Leverage (Strengths x Opportunities):**

**Defend (Strengths x Threats):**

**Improve (Weaknesses x Opportunities):**

**Avoid (Weaknesses x Threats):**`}]},{id:"strategy-porters-five",title:"Porter's Five Forces",description:"Industry structure analysis using Porter's competitive framework",category:"strategy",icon:"Shield",cells:[{type:"markdown",content:`# Porter's Five Forces Analysis

Evaluate the competitive intensity and attractiveness of [industry] using Michael Porter's framework.`},{type:"ai-prompt",content:"Analyze the threat of new entrants in [industry]. Consider capital requirements, economies of scale, brand loyalty, switching costs, regulatory barriers, and access to distribution channels. Rate the threat level (Low/Medium/High)."},{type:"ai-prompt",content:"Analyze the bargaining power of suppliers in [industry]. Consider supplier concentration, uniqueness of inputs, switching costs, and forward integration threats. Rate the power level (Low/Medium/High)."},{type:"ai-prompt",content:"Analyze the bargaining power of buyers in [industry]. Consider buyer concentration, price sensitivity, product differentiation, switching costs, and backward integration threats. Rate the power level (Low/Medium/High)."},{type:"ai-prompt",content:"Analyze the threat of substitute products or services in [industry]. Consider price-performance tradeoffs, switching costs, and buyer propensity to substitute. Rate the threat level (Low/Medium/High)."},{type:"ai-prompt",content:"Analyze the intensity of competitive rivalry in [industry]. Consider number of competitors, industry growth rate, product differentiation, exit barriers, and fixed costs. Rate the rivalry level (Low/Medium/High)."},{type:"markdown",content:`## Summary

| Force | Rating | Key Drivers |
|-------|--------|-------------|
| New Entrants | | |
| Supplier Power | | |
| Buyer Power | | |
| Substitutes | | |
| Rivalry | | |

**Overall industry attractiveness:**`}]},{id:"strategy-blue-ocean",title:"Blue Ocean Strategy",description:"Identify uncontested market space with value innovation",category:"strategy",icon:"Waves",cells:[{type:"markdown",content:`# Blue Ocean Strategy

Move beyond competing in existing market space. Map the current value curve, then apply the Four Actions Framework to create uncontested space.`},{type:"ai-prompt",content:"Map the value curve for [industry]. Identify the 8-12 key factors that companies compete on (e.g., price, features, support, brand, speed). Rate the typical industry offering on each factor (1-10). Then rate [company] on the same factors."},{type:"markdown",content:`## Four Actions Framework

**Eliminate:** Which factors that the industry takes for granted should be eliminated?

**Reduce:** Which factors should be reduced well below the industry standard?

**Raise:** Which factors should be raised well above the industry standard?

**Create:** Which factors should be created that the industry has never offered?`},{type:"code",content:`# Value curve visualization
import matplotlib.pyplot as plt
import numpy as np

factors = ['Price', 'Features', 'Support', 'Speed', 'UX', 'Integration', 'AI/ML', 'Customization']
industry_avg = [7, 8, 6, 5, 5, 4, 3, 6]
your_company = [5, 6, 8, 8, 9, 9, 9, 4]

x = np.arange(len(factors))
plt.figure(figsize=(10, 5))
plt.plot(x, industry_avg, 'o--', label='Industry Average', color='gray')
plt.plot(x, your_company, 'o-', label='Your Strategy', color='#4F46E5')
plt.xticks(x, factors, rotation=45)
plt.ylabel('Investment Level')
plt.title('Strategy Canvas')
plt.legend()
plt.tight_layout()
plt.show()`}]},{id:"strategy-tam-sam-som",title:"TAM / SAM / SOM",description:"Market sizing from total addressable to serviceable obtainable",category:"strategy",icon:"BarChart3",cells:[{type:"markdown",content:`# TAM / SAM / SOM Analysis

Size the market opportunity from top-down and bottom-up perspectives. Use this to validate product-market fit and inform fundraising narratives.`},{type:"ai-prompt",content:"Estimate the Total Addressable Market (TAM) for [product/service] in [industry]. Use a top-down approach: identify the total number of potential customers globally, average revenue per customer, and total market value. Cite data sources."},{type:"ai-prompt",content:"Estimate the Serviceable Addressable Market (SAM) for [product/service]. Narrow TAM by geographic focus, customer segment, and product fit. What percentage of TAM is realistically reachable with current capabilities?"},{type:"code",content:`# Market sizing calculation
tam_customers = 500000  # Total potential customers globally
avg_contract_value = 24000  # Annual contract value ($)
tam = tam_customers * avg_contract_value

sam_pct = 0.15  # % of TAM serviceable
sam = tam * sam_pct

som_pct = 0.05  # % of SAM obtainable in 3 years
som = sam * som_pct

print(f'TAM: \${tam:,.0f}')
print(f'SAM: \${sam:,.0f} ({sam_pct*100:.0f}% of TAM)')
print(f'SOM: \${som:,.0f} ({som_pct*100:.0f}% of SAM)')
print(f'\\nImplied 3-year ARR target: \${som:,.0f}')`},{type:"markdown",content:`## Assumptions & Validation

| Assumption | Source | Confidence |
|-----------|--------|------------|
| Total customers | | |
| ACV | | |
| SAM % | | |
| SOM % | | |`}]},{id:"strategy-positioning-map",title:"Positioning Map",description:"Plot competitors on a 2D perceptual map to find whitespace",category:"strategy",icon:"Crosshair",cells:[{type:"markdown",content:`# Competitive Positioning Map

Visualize where competitors sit on key dimensions to identify positioning whitespace and differentiation opportunities.`},{type:"ai-prompt",content:"Identify the two most important competitive dimensions in [industry] (e.g., price vs. sophistication, breadth vs. depth, enterprise vs. SMB). Then plot the top 8-10 competitors on these dimensions with brief rationale."},{type:"code",content:`# Positioning map visualization
import matplotlib.pyplot as plt

companies = {
    'Competitor A': (8, 7),
    'Competitor B': (3, 8),
    'Competitor C': (6, 4),
    'Competitor D': (2, 3),
    'Your Company': (7, 9),
}

fig, ax = plt.subplots(figsize=(8, 8))
for name, (x, y) in companies.items():
    color = '#4F46E5' if name == 'Your Company' else '#94A3B8'
    ax.scatter(x, y, s=200, c=color, zorder=5)
    ax.annotate(name, (x, y), textcoords='offset points', xytext=(10, 10))

ax.set_xlabel('Dimension 1 (e.g., Price Level)')
ax.set_ylabel('Dimension 2 (e.g., Sophistication)')
ax.set_xlim(0, 10)
ax.set_ylim(0, 10)
ax.set_title('Competitive Positioning Map')
ax.grid(True, alpha=0.3)
plt.tight_layout()
plt.show()`},{type:"markdown",content:`## Positioning Implications

- **Current position:** Where do we sit today?
- **Desired position:** Where do we want to be in 12 months?
- **Moves required:** What product/marketing changes get us there?`}]},{id:"strategy-growth",title:"Growth Strategy",description:"Identify and prioritize growth levers for your business",category:"strategy",icon:"TrendingUp",cells:[{type:"markdown",content:`# Growth Strategy Framework

Analyze current growth trajectory, identify high-impact levers, and create an actionable plan to accelerate growth.`},{type:"ai-prompt",content:"Analyze the current growth state of a [industry] company with [revenue/ARR] and [growth rate]. Identify which stage of growth the company is in (early traction, scaling, optimization) and the typical growth patterns for this stage."},{type:"markdown",content:`## Growth Levers

Rate each lever on Impact (1-5) and Effort (1-5):

| Lever | Impact | Effort | Priority |
|-------|--------|--------|----------|
| New customer acquisition | | | |
| Expansion revenue (upsell) | | | |
| Reduce churn | | | |
| Pricing optimization | | | |
| New market/segment | | | |
| New product/feature | | | |
| Channel partnerships | | | |
| Viral/referral loops | | | |`},{type:"ai-prompt",content:"For a [industry] company at [revenue stage], recommend the top 3 growth levers to prioritize. For each, provide specific tactics, expected impact on growth rate, timeline to results, and resource requirements."},{type:"markdown",content:`## 90-Day Action Plan

### Month 1
- [ ] 

### Month 2
- [ ] 

### Month 3
- [ ] 

**Success metric:** [target growth rate] by [date]`}]},{id:"strategy-okr",title:"OKR Framework",description:"Set and track Objectives and Key Results for the quarter",category:"strategy",icon:"Target",cells:[{type:"markdown",content:`# OKR Framework

Define quarterly Objectives and Key Results. Each objective should be ambitious and qualitative. Each key result should be measurable and time-bound.`},{type:"ai-prompt",content:"Suggest 3-5 quarterly OKRs for a [role/team] at a [stage] [industry] company. Each objective should have 3-4 measurable key results. Make them ambitious but achievable (70% confidence level)."},{type:"markdown",content:`## Objective 1: [Title]

| Key Result | Target | Current | Status |
|-----------|--------|---------|--------|
| KR1: | | | |
| KR2: | | | |
| KR3: | | | |

## Objective 2: [Title]

| Key Result | Target | Current | Status |
|-----------|--------|---------|--------|
| KR1: | | | |
| KR2: | | | |
| KR3: | | | |`},{type:"code",content:`# OKR progress tracker
okrs = [
    {'objective': 'Objective 1', 'krs': [
        {'name': 'KR1', 'target': 100, 'current': 0},
        {'name': 'KR2', 'target': 50, 'current': 0},
        {'name': 'KR3', 'target': 25, 'current': 0},
    ]},
]

for okr in okrs:
    print(f"\\n{okr['objective']}")
    total_progress = 0
    for kr in okr['krs']:
        pct = (kr['current'] / kr['target']) * 100
        total_progress += pct
        bar = '#' * int(pct // 5) + '-' * (20 - int(pct // 5))
        print(f"  {kr['name']}: [{bar}] {pct:.0f}%")
    avg = total_progress / len(okr['krs'])
    print(f"  Overall: {avg:.0f}%")`}]},{id:"strategy-gtm",title:"GTM Plan",description:"Go-to-market planning with audience, channels, and timeline",category:"strategy",icon:"Rocket",cells:[{type:"markdown",content:`# Go-to-Market Plan

Comprehensive plan for launching [product/feature] to market. Covers target audience, messaging, channels, timeline, and budget.`},{type:"ai-prompt",content:"Define the ideal customer profile (ICP) and key buyer personas for [product] in [industry]. Include company demographics (size, vertical, tech stack) and individual buyer attributes (title, pain points, buying triggers, objections)."},{type:"markdown",content:`## Messaging Framework

**Positioning statement:** For [target customer] who [need], [product] is a [category] that [key benefit]. Unlike [alternative], we [differentiator].

**Value propositions:**
1. 
2. 
3. `},{type:"ai-prompt",content:"Recommend the top 5 acquisition channels for [product] targeting [ICP]. For each channel, estimate: cost per lead, conversion rate, time to results, and scalability. Rank by expected ROI."},{type:"markdown",content:`## Launch Timeline

| Week | Milestone | Owner | Status |
|------|-----------|-------|--------|
| W-4 | Messaging finalized | | |
| W-3 | Sales enablement ready | | |
| W-2 | Content and assets live | | |
| W-1 | PR/analyst outreach | | |
| Launch | Product available | | |
| W+1 | Post-launch review | | |`},{type:"markdown",content:`## Budget Allocation

| Category | Budget | % of Total |
|----------|--------|------------|
| Paid media | | |
| Content | | |
| Events | | |
| PR | | |
| Sales enablement | | |
| **Total** | | 100% |`}]},{id:"strategy-business-model-canvas",title:"Business Model Canvas",description:"Map all 9 building blocks of your business model",category:"strategy",icon:"LayoutGrid",cells:[{type:"markdown",content:`# Business Model Canvas

A strategic tool for developing new or documenting existing business models. Fill in each of the 9 blocks below.`},{type:"ai-prompt",content:"Analyze the business model of [company] and fill in the Business Model Canvas. For each of the 9 blocks (Customer Segments, Value Propositions, Channels, Customer Relationships, Revenue Streams, Key Resources, Key Activities, Key Partnerships, Cost Structure), provide 3-5 bullet points."},{type:"markdown",content:`## Customer Segments
Who are you creating value for?

## Value Propositions
What value do you deliver to the customer?

## Channels
How do you reach your customer segments?

## Customer Relationships
What type of relationship does each segment expect?

## Revenue Streams
What are customers willing to pay for?`},{type:"markdown",content:`## Key Resources
What assets are required to make the model work?

## Key Activities
What activities does the value proposition require?

## Key Partnerships
Who are your key partners and suppliers?

## Cost Structure
What are the most important costs inherent in the model?`}]},{id:"strategy-value-chain",title:"Value Chain Analysis",description:"Map primary and support activities to find competitive advantage",category:"strategy",icon:"Link",cells:[{type:"markdown",content:`# Value Chain Analysis

Identify the activities that create value and cost in [company/product]. Find sources of competitive advantage by examining each link in the chain.`},{type:"ai-prompt",content:"Analyze the primary value chain activities for a [industry] company: Inbound Logistics, Operations, Outbound Logistics, Marketing & Sales, and Service. For each, describe the key activities, cost drivers, and differentiation opportunities."},{type:"ai-prompt",content:"Analyze the support value chain activities for a [industry] company: Firm Infrastructure, HR Management, Technology Development, and Procurement. For each, describe how they enable or constrain the primary activities."},{type:"markdown",content:`## Margin Analysis

| Activity | Cost % | Value Contribution | Competitive Advantage? |
|----------|--------|-------------------|----------------------|
| Inbound Logistics | | | |
| Operations | | | |
| Outbound Logistics | | | |
| Marketing & Sales | | | |
| Service | | | |

**Key insight:** Where does the most value get created vs. destroyed?`}]},{id:"intelligence-weekly-brief",title:"Weekly Intelligence Brief",description:"Automated weekly summary of competitive and market signals",category:"intelligence",icon:"CalendarDays",cells:[{type:"markdown",content:`# Weekly Intelligence Brief

**Week of:** [date]
**Prepared for:** [team/executive]

This brief synthesizes the most important competitive, market, and industry signals from the past 7 days.`},{type:"ai-prompt",content:"Summarize the top 5 competitive developments in [industry] from the past week. Include product launches, funding rounds, partnerships, leadership changes, and pricing moves. For each, rate the impact on [company] as Low/Medium/High."},{type:"ai-prompt",content:"Identify the top 3 market trends or macro signals from the past week that affect [industry]. Consider economic indicators, regulatory changes, technology shifts, and consumer behavior changes."},{type:"markdown",content:`## Action Items

| Signal | Recommended Action | Owner | Priority |
|--------|-------------------|-------|----------|
| | | | |
| | | | |
| | | | |

## Next Week Watch List
- 
- 
- `}]},{id:"intelligence-daily-digest",title:"Daily Digest",description:"Quick daily scan of overnight changes and priority signals",category:"intelligence",icon:"Sunrise",cells:[{type:"markdown",content:`# Daily Intelligence Digest

**Date:** [date]

Quick-scan of overnight developments requiring attention.`},{type:"ai-prompt",content:"What are the most important overnight developments affecting [industry] as of [date]? Check for: earnings reports, product announcements, regulatory news, M&A activity, and executive moves. Prioritize by urgency."},{type:"markdown",content:`## Priority Signals

**Immediate attention:**
- 

**Monitor today:**
- 

**Background awareness:**
- `}]},{id:"intelligence-competitor-deep-dive",title:"Competitor Deep Dive",description:"Comprehensive single-competitor intelligence report",category:"intelligence",icon:"Eye",cells:[{type:"markdown",content:`# Competitor Deep Dive: [Competitor Name]

Comprehensive intelligence dossier on a single competitor. Updated [date].`},{type:"ai-prompt",content:"Provide a company overview of [competitor]: founding year, headquarters, employee count, funding/revenue, key executives, mission statement, and recent major milestones."},{type:"ai-prompt",content:"Analyze [competitor]'s product portfolio. For each major product: target customer, key features, pricing model, strengths, and weaknesses relative to [your company]."},{type:"ai-prompt",content:"Analyze [competitor]'s go-to-market strategy. Cover: sales motion (PLG vs. sales-led), marketing channels, content strategy, partnership ecosystem, and geographic focus."},{type:"markdown",content:`## Strategic Assessment

**Where they are winning:** 

**Where they are vulnerable:** 

**Likely next moves:** 

**Our recommended response:** `}]},{id:"intelligence-industry-trends",title:"Industry Trends Report",description:"Macro trends, emerging tech, and regulatory landscape analysis",category:"intelligence",icon:"TrendingUp",cells:[{type:"markdown",content:`# Industry Trends Report: [Industry]

**Period:** [Quarter/Year]

Analysis of macro-level trends shaping the industry over the next 12-24 months.`},{type:"ai-prompt",content:"Identify the top 5 macro trends affecting [industry] over the next 12-24 months. For each trend, describe: the driving forces, current evidence, expected impact, and timeline. Include both technology trends and market/regulatory trends."},{type:"ai-prompt",content:"What emerging technologies are most likely to disrupt [industry] in the next 2-5 years? For each, assess: maturity level (nascent/emerging/mainstream), adoption barriers, and potential impact on [company]'s business model."},{type:"ai-prompt",content:"Summarize the current and upcoming regulatory landscape affecting [industry]. Include pending legislation, enforcement trends, and compliance requirements. Highlight any that pose existential risk or create opportunity."},{type:"markdown",content:`## Implications for [Company]

| Trend | Impact (1-5) | Urgency | Our Readiness | Action Needed |
|-------|-------------|---------|--------------|---------------|
| | | | | |
| | | | | |`}]},{id:"intelligence-social-listening",title:"Social Listening Summary",description:"Brand mentions, sentiment analysis, and key conversation themes",category:"intelligence",icon:"MessageCircle",cells:[{type:"markdown",content:`# Social Listening Summary

**Period:** [dates]
**Platforms:** Twitter/X, LinkedIn, Reddit, G2, Hacker News

Aggregate view of brand and competitor mentions across social channels.`},{type:"ai-prompt",content:"Analyze social media mentions of [brand] over the past [timeframe]. Categorize by: sentiment (positive/neutral/negative), platform, topic theme, and volume trend. Highlight any viral posts or emerging narratives."},{type:"ai-prompt",content:"Compare social sentiment for [brand] vs. [competitor 1] and [competitor 2] over the past [timeframe]. Identify topics where each brand is perceived positively or negatively. Note any share-of-voice shifts."},{type:"markdown",content:`## Key Themes

| Theme | Sentiment | Volume | Trend | Action |
|-------|-----------|--------|-------|--------|
| | | | | |

## Notable Posts / Threads

1. 
2. 
3. `}]},{id:"intelligence-pr-media",title:"PR & Media Monitor",description:"Press coverage tracking, message analysis, and media strategy",category:"intelligence",icon:"Newspaper",cells:[{type:"markdown",content:`# PR & Media Monitor

**Period:** [dates]

Track press coverage, analyze message penetration, and inform media strategy.`},{type:"ai-prompt",content:"Summarize recent press coverage of [company] and key competitors in [industry]. Include: publication, headline, tone, key messages, and estimated reach. Highlight any coverage that deviates from desired narrative."},{type:"markdown",content:`## Message Penetration

| Key Message | Appeared In | Frequency | Accuracy |
|------------|------------|-----------|----------|
| | | | |

## Media Strategy Recommendations

- **Pitch angles for next month:**
- **Publications to target:**
- **Reactive statement needed:**`}]},{id:"intelligence-seo-audit",title:"SEO Competitive Audit",description:"Keyword gaps, content opportunities, and technical SEO issues",category:"intelligence",icon:"Search",cells:[{type:"markdown",content:`# SEO Competitive Audit

**Domain:** [your-domain.com]
**Competitors:** [competitor domains]

Identify keyword gaps, content opportunities, and technical improvements.`},{type:"ai-prompt",content:"Identify the top 20 high-value keywords that [competitor domain] ranks for but [your domain] does not. For each keyword, provide: search volume, difficulty, current top-ranking page, and content type needed to compete."},{type:"ai-prompt",content:"Suggest 10 content pieces that would close the biggest SEO gaps between [your domain] and [competitor domain]. For each, specify: target keyword cluster, content format (blog, guide, tool), estimated traffic potential, and production effort."},{type:"markdown",content:`## Technical SEO Issues

| Issue | Pages Affected | Priority | Fix |
|-------|---------------|----------|-----|
| | | | |

## Quick Wins (next 30 days)
1. 
2. 
3. `}]},{id:"intelligence-share-of-voice",title:"Share of Voice",description:"Media, social, and search share analysis across competitors",category:"intelligence",icon:"PieChart",cells:[{type:"markdown",content:`# Share of Voice Report

**Period:** [dates]

Measure brand visibility relative to competitors across media, social, and search.`},{type:"ai-prompt",content:"Estimate the share of voice for [company] vs. [competitor 1], [competitor 2], [competitor 3] across: earned media mentions, social media engagement, and organic search visibility. Provide percentages and trend direction (up/down/flat)."},{type:"code",content:`# Share of voice visualization
import matplotlib.pyplot as plt

companies = ['Your Company', 'Competitor A', 'Competitor B', 'Competitor C', 'Others']
media_share = [22, 28, 20, 15, 15]
social_share = [30, 25, 18, 17, 10]
search_share = [18, 32, 22, 16, 12]

fig, axes = plt.subplots(1, 3, figsize=(15, 5))
for ax, data, title in zip(axes, [media_share, social_share, search_share], ['Media', 'Social', 'Search']):
    ax.pie(data, labels=companies, autopct='%1.0f%%', startangle=90)
    ax.set_title(f'{title} Share of Voice')
plt.tight_layout()
plt.show()`},{type:"markdown",content:`## Trend Analysis

| Company | Last Period | This Period | Change |
|---------|-----------|------------|--------|
| | | | |

**Key drivers of change:**`}]},{id:"intelligence-brand-health",title:"Brand Health Dashboard",description:"NPS trends, sentiment tracking, and brand awareness metrics",category:"intelligence",icon:"Heart",cells:[{type:"markdown",content:`# Brand Health Dashboard

**Period:** [dates]

Holistic view of brand strength across awareness, perception, and loyalty metrics.`},{type:"ai-prompt",content:"Outline the key brand health metrics for a [industry] company. Include: aided/unaided awareness, Net Promoter Score, brand sentiment, consideration rate, and brand associations. Suggest benchmarks for each."},{type:"code",content:`# NPS trend tracker
import matplotlib.pyplot as plt

months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
nps_scores = [32, 35, 33, 38, 41, 44]
promoters = [48, 50, 49, 52, 55, 57]
detractors = [16, 15, 16, 14, 14, 13]

fig, ax1 = plt.subplots(figsize=(10, 5))
ax1.plot(months, nps_scores, 'o-', color='#4F46E5', linewidth=2, label='NPS')
ax1.fill_between(months, nps_scores, alpha=0.1, color='#4F46E5')
ax1.set_ylabel('NPS Score')
ax1.set_ylim(0, 70)
ax1.legend(loc='upper left')
ax1.set_title('NPS Trend')
plt.tight_layout()
plt.show()`},{type:"markdown",content:`## Brand Perception

| Attribute | Target | Actual | Gap |
|-----------|--------|--------|-----|
| Innovative | | | |
| Trustworthy | | | |
| Easy to use | | | |
| Good value | | | |

**Actions to close gaps:**`}]},{id:"intelligence-pricing",title:"Pricing Intelligence",description:"Competitor pricing analysis with value mapping and recommendations",category:"intelligence",icon:"DollarSign",cells:[{type:"markdown",content:`# Pricing Intelligence Report

**Industry:** [industry]
**Date:** [date]

Comprehensive analysis of competitor pricing strategies and recommendations for positioning.`},{type:"ai-prompt",content:"Analyze the pricing strategies of the top 5 competitors in [industry]. For each, detail: pricing model (per-seat, usage, flat), tier structure, entry price, enterprise price, and any recent pricing changes. Include free/trial offerings."},{type:"markdown",content:`## Pricing Comparison Matrix

| Feature/Tier | Your Co. | Comp A | Comp B | Comp C |
|-------------|----------|--------|--------|--------|
| Entry price | | | | |
| Mid-tier | | | | |
| Enterprise | | | | |
| Free tier | | | | |
| Pricing model | | | | |`},{type:"ai-prompt",content:"Based on the competitive pricing landscape in [industry], recommend a pricing strategy for [company]. Consider: value metric alignment, willingness to pay, competitive positioning, and expansion revenue potential. Provide specific price points with rationale."}]},{id:"marketing-campaign-review",title:"Campaign Performance Review",description:"KPI summary, channel breakdown, and optimization recommendations",category:"marketing",icon:"Megaphone",cells:[{type:"markdown",content:`# Campaign Performance Review

**Campaign:** [name]
**Period:** [dates]
**Budget:** $[amount]

Post-campaign analysis with KPI results, channel performance, and recommendations for next iteration.`},{type:"ai-prompt",content:"Provide a framework for evaluating a [campaign type] campaign performance. Include the top 10 KPIs to track, benchmark ranges for [industry], and how to calculate ROAS, CAC, and contribution to pipeline."},{type:"markdown",content:`## KPI Summary

| Metric | Target | Actual | % of Goal |
|--------|--------|--------|----------|
| Impressions | | | |
| Clicks / CTR | | | |
| Conversions | | | |
| Cost per Lead | | | |
| ROAS | | | |
| Pipeline Generated | | | |`},{type:"markdown",content:`## Channel Breakdown

| Channel | Spend | Leads | CPL | Conv Rate |
|---------|-------|-------|-----|----------|
| Paid Search | | | | |
| Paid Social | | | | |
| Email | | | | |
| Content/SEO | | | | |
| Events | | | | |`},{type:"markdown",content:`## Recommendations

**Scale:** Channels/tactics that exceeded targets

**Optimize:** Channels/tactics with potential but underperforming

**Cut:** Channels/tactics to eliminate or reduce`}]},{id:"marketing-attribution",title:"Channel Attribution",description:"Multi-touch attribution analysis and budget reallocation",category:"marketing",icon:"GitBranch",cells:[{type:"markdown",content:`# Channel Attribution Analysis

**Period:** [dates]

Understand which channels and touchpoints drive conversions using multi-touch attribution modeling.`},{type:"ai-prompt",content:"Explain the differences between first-touch, last-touch, linear, time-decay, and data-driven attribution models. For a [business type] company, recommend the most appropriate model and explain why."},{type:"code",content:`# Multi-touch attribution calculation
import pandas as pd

# Example touchpoint data
touchpoints = pd.DataFrame({
    'Channel': ['Paid Search', 'LinkedIn', 'Email', 'Webinar', 'Direct'],
    'First_Touch_Pct': [35, 25, 10, 20, 10],
    'Last_Touch_Pct': [20, 10, 30, 15, 25],
    'Linear_Pct': [22, 18, 25, 20, 15],
    'Spend': [50000, 30000, 5000, 15000, 0],
})

touchpoints['Linear_Revenue'] = touchpoints['Linear_Pct'] / 100 * 500000
touchpoints['ROAS'] = touchpoints['Linear_Revenue'] / touchpoints['Spend'].replace(0, float('inf'))

print(touchpoints.to_markdown(index=False))`},{type:"markdown",content:`## Budget Reallocation Recommendation

| Channel | Current Budget | Recommended | Change | Rationale |
|---------|---------------|------------|--------|----------|
| | | | | |

**Expected impact of reallocation:** [X]% improvement in blended CAC`}]},{id:"marketing-content-calendar",title:"Content Calendar",description:"Themed content planning with calendar grid and distribution",category:"marketing",icon:"CalendarDays",cells:[{type:"markdown",content:`# Content Calendar

**Quarter:** [Q_ 20__]
**Content pillars:** [pillar 1], [pillar 2], [pillar 3]

Plan, schedule, and track content production across all channels.`},{type:"ai-prompt",content:"Suggest a quarterly content calendar for a [industry] company targeting [audience]. Include: 4 content pillars, 12 blog posts (1/week), 4 long-form pieces, 2 webinars, and 48 social posts. For each item, provide a title, format, target keyword, and distribution channel."},{type:"code",content:`# Content calendar grid
import pandas as pd

calendar = pd.DataFrame({
    'Week': [f'W{i}' for i in range(1, 13)],
    'Blog_Post': [''] * 12,
    'Social_Theme': [''] * 12,
    'Long_Form': ['', '', '', 'Whitepaper', '', '', 'Case Study', '', '', 'Report', '', 'Guide'],
    'Email': ['Newsletter'] * 12,
    'Status': ['Planned'] * 12,
})

print(calendar.to_markdown(index=False))`},{type:"markdown",content:`## Distribution Plan

| Content Type | Primary Channel | Amplification | Repurpose Into |
|-------------|----------------|--------------|----------------|
| Blog post | Website/SEO | LinkedIn, Twitter | Social snippets, email |
| Whitepaper | Gated landing page | Paid, email | Blog series, webinar |
| Webinar | Live event | Email, paid | Blog recap, video clips |
| Case study | Sales enablement | Website, email | Social proof ads |`}]},{id:"marketing-creative-analysis",title:"Ad Creative Analysis",description:"Creative performance comparison, A/B results, and iterations",category:"marketing",icon:"Palette",cells:[{type:"markdown",content:`# Ad Creative Analysis

**Campaign:** [name]
**Platform:** [platform]
**Period:** [dates]

Analyze creative performance to inform next round of iterations.`},{type:"ai-prompt",content:"What are the best practices for analyzing ad creative performance on [platform]? Include: key metrics to compare (CTR, conversion rate, cost per result, engagement rate), sample sizes needed for significance, and common creative testing frameworks."},{type:"markdown",content:`## Creative Performance

| Creative | Impressions | CTR | Conv Rate | CPA | ROAS |
|---------|------------|-----|-----------|-----|------|
| Creative A | | | | | |
| Creative B | | | | | |
| Creative C | | | | | |

## A/B Test Results

**Hypothesis:** 
**Winner:** 
**Confidence level:** 
**Key learning:** `},{type:"markdown",content:`## Next Iteration Plan

| Element to Test | Variant A | Variant B | Expected Impact |
|----------------|-----------|-----------|----------------|
| Headline | | | |
| Visual | | | |
| CTA | | | |
| Audience | | | |`}]},{id:"marketing-funnel",title:"Funnel Analysis",description:"Conversion funnel mapping with drop-off analysis and optimization",category:"marketing",icon:"Filter",cells:[{type:"markdown",content:`# Funnel Analysis

**Funnel:** [acquisition / activation / monetization]
**Period:** [dates]

Map conversion rates at each stage, identify bottlenecks, and plan optimizations.`},{type:"ai-prompt",content:"For a [B2B SaaS / e-commerce / marketplace] company, define the typical conversion funnel stages from first touch to revenue. For each stage, provide: definition, typical conversion rate benchmark, and key metrics to track."},{type:"code",content:`# Funnel visualization
stages = ['Visitors', 'Signups', 'Activated', 'Paid', 'Retained (M3)']
counts = [100000, 5000, 2000, 400, 280]

for i, (stage, count) in enumerate(zip(stages, counts)):
    conv = f' ({count/counts[i-1]*100:.1f}% conv)' if i > 0 else ''
    bar = '#' * int(count / max(counts) * 40)
    print(f'{stage:20s} {count:>8,}{conv}')
    print(f'  {bar}')
    if i < len(stages) - 1:
        drop = counts[i] - counts[i+1]
        print(f'  --> Drop-off: {drop:,} ({drop/counts[i]*100:.1f}%)')`},{type:"markdown",content:`## Optimization Plan

| Stage | Current Rate | Target | Tactics |
|-------|-------------|--------|--------|
| Visit -> Signup | | | |
| Signup -> Activated | | | |
| Activated -> Paid | | | |
| Paid -> Retained | | | |

**Highest-leverage fix:** [stage with biggest absolute drop-off]`}]},{id:"marketing-audience-segmentation",title:"Audience Segmentation",description:"Segment analysis, persona profiles, and targeting strategy",category:"marketing",icon:"Users",cells:[{type:"markdown",content:`# Audience Segmentation

Define and analyze customer segments to improve targeting, messaging, and product-market fit.`},{type:"ai-prompt",content:"Suggest 4-6 customer segments for a [product] in [industry]. For each segment, provide: segment name, size estimate, defining characteristics (firmographic + behavioral), primary pain point, willingness to pay, and acquisition channel."},{type:"markdown",content:`## Segment Profiles

### Segment 1: [Name]
- **Size:** 
- **Characteristics:** 
- **Pain point:** 
- **Messaging angle:** 
- **Best channel:** 
- **LTV potential:** 

### Segment 2: [Name]
- **Size:** 
- **Characteristics:** 
- **Pain point:** 
- **Messaging angle:** 
- **Best channel:** 
- **LTV potential:** `},{type:"ai-prompt",content:"Create a targeting prioritization matrix for [company]'s customer segments. Rank segments by: market size, willingness to pay, ease of acquisition, strategic fit, and expansion potential. Recommend which 1-2 segments to focus on and why."}]},{id:"marketing-email-performance",title:"Email Performance",description:"Campaign metrics, subject line analysis, and send optimization",category:"marketing",icon:"Mail",cells:[{type:"markdown",content:`# Email Performance Analysis

**Period:** [dates]
**List size:** [count]

Analyze email campaign effectiveness and identify optimization opportunities.`},{type:"ai-prompt",content:"Provide benchmarks for email marketing metrics in [industry]: open rate, click rate, click-to-open rate, unsubscribe rate, bounce rate, and conversion rate. Break down by email type (newsletter, promotional, transactional, nurture)."},{type:"markdown",content:`## Campaign Results

| Campaign | Sent | Open Rate | Click Rate | CTOR | Unsub Rate | Conversions |
|---------|------|-----------|-----------|------|-----------|-------------|
| | | | | | | |

## Subject Line Analysis

| Subject Line | Open Rate | vs. Avg | Key Element |
|-------------|-----------|---------|-------------|
| | | | |

## Recommendations

- **Subject lines:** 
- **Send time:** 
- **Segmentation:** 
- **Content:** `}]},{id:"marketing-budget-allocator",title:"Budget Allocator",description:"Data-driven marketing budget allocation across channels",category:"marketing",icon:"Calculator",cells:[{type:"markdown",content:`# Marketing Budget Allocator

**Total Budget:** $[amount]
**Period:** [quarter/year]

Allocate budget across channels based on historical performance and strategic priorities.`},{type:"ai-prompt",content:"For a [stage] [industry] company with a $[X] quarterly marketing budget, suggest an optimal channel allocation. Consider: paid search, paid social, content/SEO, email, events, partnerships, and brand. Provide percentage allocation and expected CAC by channel."},{type:"code",content:`# Budget allocation optimizer
import pandas as pd

total_budget = 250000

channels = pd.DataFrame({
    'Channel': ['Paid Search', 'Paid Social', 'Content/SEO', 'Email', 'Events', 'Partnerships'],
    'Current_Pct': [30, 25, 15, 10, 15, 5],
    'Hist_CAC': [180, 220, 95, 45, 350, 120],
    'Hist_Conv_Rate': [3.2, 1.8, 2.5, 4.1, 1.2, 2.8],
})

channels['Current_Budget'] = total_budget * channels['Current_Pct'] / 100
channels['Expected_Leads'] = channels['Current_Budget'] / channels['Hist_CAC']

print(channels.to_markdown(index=False))
print(f"\\nTotal expected leads: {channels['Expected_Leads'].sum():.0f}")
print(f"Blended CAC: \${total_budget / channels['Expected_Leads'].sum():.0f}")`},{type:"markdown",content:`## Recommended Reallocation

| Channel | Current % | Recommended % | Change | Rationale |
|---------|-----------|--------------|--------|----------|
| | | | | |

**Expected impact:** [X]% more leads at [Y]% lower blended CAC`}]},{id:"marketing-roi-calculator",title:"ROI Calculator",description:"Investment return modeling with break-even analysis",category:"marketing",icon:"Calculator",cells:[{type:"markdown",content:`# Marketing ROI Calculator

Model the return on a marketing investment with scenario analysis and break-even projections.`},{type:"code",content:`# ROI Calculator
investment = 100000  # Total marketing investment
cpl = 150  # Cost per lead
lead_to_opp = 0.20  # Lead to opportunity rate
opp_to_close = 0.25  # Opportunity to close rate
avg_deal_size = 30000  # Average deal value

leads = investment / cpl
opportunities = leads * lead_to_opp
closed_deals = opportunities * opp_to_close
revenue = closed_deals * avg_deal_size
roi = (revenue - investment) / investment * 100

print(f'Investment: \${investment:,.0f}')
print(f'Leads generated: {leads:.0f}')
print(f'Opportunities: {opportunities:.0f}')
print(f'Closed deals: {closed_deals:.0f}')
print(f'Revenue: \${revenue:,.0f}')
print(f'ROI: {roi:.0f}%')
print(f'\\nBreak-even requires {investment / avg_deal_size:.1f} deals')
print(f'Break-even CPL: \${avg_deal_size * lead_to_opp * opp_to_close:.0f}')`},{type:"markdown",content:`## Scenario Analysis

| Scenario | CPL | Conv Rate | Revenue | ROI |
|---------|-----|-----------|---------|-----|
| Conservative | | | | |
| Base case | | | | |
| Optimistic | | | | |

## Assumptions & Risks

- 
- `}]},{id:"marketing-campaign-planning",title:"Campaign Planning",description:"End-to-end campaign plan from objectives to creative brief",category:"marketing",icon:"ClipboardList",cells:[{type:"markdown",content:`# Campaign Planning Brief

**Campaign name:** [name]
**Launch date:** [date]
**Campaign owner:** [name]`},{type:"markdown",content:`## Objectives

**Business objective:** 
**Marketing objective:** 
**KPIs:**
- Primary: 
- Secondary: 

**Budget:** $[amount]`},{type:"ai-prompt",content:"For a [campaign type] campaign targeting [audience] in [industry], recommend: target audience segments, key messages per segment, channel mix, content assets needed, and a week-by-week timeline for a [X]-week campaign."},{type:"markdown",content:`## Creative Brief

**Key message:** 
**Tone:** 
**Visual direction:** 
**Call to action:** 
**Mandatory inclusions:** 

## Asset Checklist

- [ ] Landing page
- [ ] Email sequences (x[count])
- [ ] Ad creatives (x[count])
- [ ] Social posts (x[count])
- [ ] Blog post
- [ ] Sales enablement`},{type:"markdown",content:`## Timeline

| Week | Activity | Owner | Status |
|------|----------|-------|--------|
| W-3 | Brief approved | | |
| W-2 | Assets in production | | |
| W-1 | QA and staging | | |
| Launch | Go live | | |
| W+1 | Optimization pass | | |
| W+2 | Mid-campaign review | | |`}]},{id:"finance-revenue-forecast",title:"Revenue Forecast",description:"Historical trend analysis with growth assumptions and projections",category:"finance",icon:"TrendingUp",cells:[{type:"markdown",content:`# Revenue Forecast

**Period:** [next 4 quarters / next 12 months]
**Base period:** [last 12 months]

Project future revenue using historical trends, growth assumptions, and scenario modeling.`},{type:"ai-prompt",content:"Provide a revenue forecasting framework for a [stage] [industry] SaaS company. Cover: key inputs (current MRR, growth rate, churn, expansion), forecasting methodologies (bottoms-up vs. top-down), and common pitfalls in SaaS revenue forecasting."},{type:"code",content:`# Revenue projection model
import pandas as pd

current_mrr = 150000
monthly_growth_rate = 0.08
monthly_churn_rate = 0.03
expansion_rate = 0.02
new_mrr_monthly = 25000

months = []
mrr = current_mrr

for m in range(1, 13):
    churned = mrr * monthly_churn_rate
    expanded = mrr * expansion_rate
    mrr = mrr - churned + expanded + new_mrr_monthly
    months.append({
        'Month': m,
        'MRR': round(mrr),
        'ARR': round(mrr * 12),
        'New': new_mrr_monthly,
        'Churned': round(churned),
        'Expanded': round(expanded)
    })

df = pd.DataFrame(months)
print(df.to_markdown(index=False))
print(f"\\nProjected ARR in 12 months: \${df.iloc[-1]['ARR']:,.0f}")`},{type:"markdown",content:`## Key Assumptions

| Assumption | Value | Source/Rationale |
|-----------|-------|------------------|
| Monthly growth rate | | |
| Churn rate | | |
| Expansion rate | | |
| New MRR/month | | |

## Risks to Forecast

- Upside: 
- Downside: `}]},{id:"finance-unit-economics",title:"Unit Economics",description:"CAC, LTV, and payback period analysis for your business",category:"finance",icon:"Coins",cells:[{type:"markdown",content:`# Unit Economics

Understand the fundamental profitability of each customer acquired. Healthy unit economics are the foundation of sustainable growth.`},{type:"ai-prompt",content:"Explain the key unit economics metrics for a [business model] company: Customer Acquisition Cost (CAC), Lifetime Value (LTV), LTV:CAC ratio, payback period, and gross margin. Provide benchmark ranges for [industry] at each funding stage."},{type:"code",content:`# Unit economics calculator
# -- Inputs --
monthly_marketing_spend = 80000
monthly_sales_spend = 120000
new_customers_per_month = 40
avg_monthly_revenue = 2500
gross_margin = 0.78
monthly_churn = 0.025

# -- Calculations --
cac = (monthly_marketing_spend + monthly_sales_spend) / new_customers_per_month
avg_lifetime_months = 1 / monthly_churn
ltv = avg_monthly_revenue * gross_margin * avg_lifetime_months
ltv_cac_ratio = ltv / cac
payback_months = cac / (avg_monthly_revenue * gross_margin)

print(f'CAC: \${cac:,.0f}')
print(f'LTV: \${ltv:,.0f}')
print(f'LTV:CAC Ratio: {ltv_cac_ratio:.1f}x')
print(f'Payback Period: {payback_months:.1f} months')
print(f'Avg Customer Lifetime: {avg_lifetime_months:.0f} months')
print(f'\\nHealth Check:')
print(f'  LTV:CAC > 3x: {"PASS" if ltv_cac_ratio > 3 else "FAIL"}')
print(f'  Payback < 12mo: {"PASS" if payback_months < 12 else "FAIL"}')`},{type:"markdown",content:`## Improvement Levers

| Lever | Current | Target | Impact on LTV:CAC |
|-------|---------|--------|-------------------|
| Reduce CAC | | | |
| Increase ARPU | | | |
| Reduce churn | | | |
| Improve gross margin | | | |`}]},{id:"finance-cohort-revenue",title:"Cohort Revenue Analysis",description:"Revenue retention curves and cohort-level performance",category:"finance",icon:"BarChart3",cells:[{type:"markdown",content:`# Cohort Revenue Analysis

Track how revenue evolves for each customer cohort over time. Identify whether newer cohorts perform better or worse than older ones.`},{type:"ai-prompt",content:"Explain cohort revenue analysis for a SaaS business. Cover: how to define cohorts (by signup month), what metrics to track (gross revenue retention, net revenue retention, expansion), and how to interpret cohort curves. Provide examples of healthy vs. concerning patterns."},{type:"code",content:`# Cohort retention matrix
import pandas as pd
import numpy as np

# Simulated cohort data (net revenue retention %)
cohorts = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
months = [f'M{i}' for i in range(7)]

data = []
for i, cohort in enumerate(cohorts):
    row = [100]  # M0 is always 100%
    for m in range(1, 7):
        retention = row[-1] * np.random.uniform(0.95, 1.05)  # ~100% NRR
        row.append(round(retention, 1))
    data.append(row[:7-i] + [None]*i)  # Future months are None

df = pd.DataFrame(data, index=cohorts, columns=months[:7])
print('Net Revenue Retention by Cohort (%)')
print(df.to_markdown())`},{type:"markdown",content:`## Key Findings

- **Gross retention:** [X]% average across cohorts
- **Net retention:** [X]% average (above/below 100%)
- **Expansion trend:** Increasing / Decreasing / Flat
- **Best cohort:** [month] -- why?
- **Worst cohort:** [month] -- why?`}]},{id:"finance-mrr-arr",title:"MRR / ARR Tracker",description:"Monthly and annual recurring revenue with growth and churn",category:"finance",icon:"BarChart3",cells:[{type:"markdown",content:`# MRR / ARR Tracker

**Current MRR:** $[amount]
**Current ARR:** $[amount]

Track the components of recurring revenue growth: new, expansion, contraction, and churn.`},{type:"ai-prompt",content:"Provide a framework for MRR/ARR tracking for a SaaS company. Define: New MRR, Expansion MRR, Contraction MRR, Churned MRR, Reactivation MRR, and Net New MRR. What are healthy benchmarks for each component at [revenue stage]?"},{type:"code",content:`# MRR waterfall
months_data = [
    {'Month': 'Jan', 'Start_MRR': 100000, 'New': 15000, 'Expansion': 8000, 'Contraction': -2000, 'Churn': -4000},
    {'Month': 'Feb', 'Start_MRR': 117000, 'New': 18000, 'Expansion': 9000, 'Contraction': -2500, 'Churn': -3500},
    {'Month': 'Mar', 'Start_MRR': 138000, 'New': 20000, 'Expansion': 10000, 'Contraction': -3000, 'Churn': -4000},
]

for m in months_data:
    net_new = m['New'] + m['Expansion'] + m['Contraction'] + m['Churn']
    end_mrr = m['Start_MRR'] + net_new
    growth = net_new / m['Start_MRR'] * 100
    print(f"{m['Month']}:")
    print(f"  Start MRR:    \${m['Start_MRR']:>10,.0f}")
    print(f"  + New:        \${m['New']:>10,.0f}")
    print(f"  + Expansion:  \${m['Expansion']:>10,.0f}")
    print(f"  - Contraction:\${m['Contraction']:>10,.0f}")
    print(f"  - Churn:      \${m['Churn']:>10,.0f}")
    print(f"  = End MRR:    \${end_mrr:>10,.0f} ({growth:+.1f}%)")
    print()`},{type:"markdown",content:`## Growth Analysis

| Metric | This Month | Last Month | Trend |
|--------|-----------|-----------|-------|
| Net New MRR | | | |
| MoM Growth | | | |
| Logo Churn Rate | | | |
| Revenue Churn Rate | | | |
| Net Revenue Retention | | | |`}]},{id:"finance-burn-rate",title:"Burn Rate Analysis",description:"Monthly burn, runway calculation, and scenario planning",category:"finance",icon:"Flame",cells:[{type:"markdown",content:`# Burn Rate Analysis

**Cash on hand:** $[amount]
**Date of last funding:** [date]

Calculate runway under different scenarios and identify levers to extend it.`},{type:"ai-prompt",content:"Provide a burn rate analysis framework for a [stage] startup. Cover: gross burn vs. net burn, fixed vs. variable costs, runway calculation methods, and what runway targets are appropriate for each stage. What are the warning signs that a company needs to act on burn?"},{type:"code",content:`# Runway calculator with scenarios
cash_on_hand = 3000000
monthly_revenue = 120000
monthly_expenses = 280000
revenue_growth_rate = 0.06  # MoM

scenarios = {
    'Base case': {'rev_growth': 0.06, 'expense_growth': 0.02},
    'Aggressive growth': {'rev_growth': 0.10, 'expense_growth': 0.05},
    'Cut to survive': {'rev_growth': 0.03, 'expense_growth': -0.10},
}

for name, params in scenarios.items():
    cash = cash_on_hand
    rev = monthly_revenue
    exp = monthly_expenses
    months = 0
    while cash > 0 and months < 36:
        net_burn = exp - rev
        cash -= net_burn
        rev *= (1 + params['rev_growth'])
        exp *= (1 + params['expense_growth'])
        months += 1
    print(f"{name}: {months} months runway")
    print(f"  Monthly net burn today: \${monthly_expenses - monthly_revenue:,.0f}")`},{type:"markdown",content:`## Expense Breakdown

| Category | Monthly | % of Total | Essential? |
|----------|---------|-----------|------------|
| People | | | |
| Cloud/Infra | | | |
| Marketing | | | |
| Office/G&A | | | |
| Software | | | |

## Recommended Actions

- If runway < 6 months: 
- If runway 6-12 months: 
- If runway > 12 months: `}]},{id:"finance-financial-model",title:"Financial Model",description:"Revenue, cost structure, P&L projection, and sensitivity analysis",category:"finance",icon:"FileSpreadsheet",cells:[{type:"markdown",content:`# Financial Model

Three-statement financial model for [company]. Covers revenue model, cost structure, P&L, and sensitivity analysis.`},{type:"ai-prompt",content:"Outline a financial model structure for a [B2B SaaS / marketplace / e-commerce] company. Define: revenue drivers (users x conversion x ARPU), cost categories (COGS, S&M, R&D, G&A), and key assumptions. What level of detail is appropriate for a [seed/Series A/Series B] company?"},{type:"code",content:`# Simplified P&L projection
import pandas as pd

years = ['Y1', 'Y2', 'Y3']
revenue = [1200000, 3000000, 7200000]
cogs_pct = 0.22
sm_pct = [0.45, 0.40, 0.35]
rd_pct = [0.30, 0.25, 0.20]
ga_pct = [0.15, 0.12, 0.10]

for i, year in enumerate(years):
    rev = revenue[i]
    cogs = rev * cogs_pct
    gross = rev - cogs
    sm = rev * sm_pct[i]
    rd = rev * rd_pct[i]
    ga = rev * ga_pct[i]
    opex = sm + rd + ga
    ebitda = gross - opex
    print(f"\\n{year}:")
    print(f"  Revenue:       \${rev:>12,.0f}")
    print(f"  COGS:          \${cogs:>12,.0f}  ({cogs_pct*100:.0f}%)")
    print(f"  Gross Profit:  \${gross:>12,.0f}  ({gross/rev*100:.0f}%)")
    print(f"  S&M:           \${sm:>12,.0f}  ({sm_pct[i]*100:.0f}%)")
    print(f"  R&D:           \${rd:>12,.0f}  ({rd_pct[i]*100:.0f}%)")
    print(f"  G&A:           \${ga:>12,.0f}  ({ga_pct[i]*100:.0f}%)")
    print(f"  EBITDA:        \${ebitda:>12,.0f}  ({ebitda/rev*100:.0f}%)")`},{type:"markdown",content:`## Key Assumptions

| Assumption | Y1 | Y2 | Y3 | Source |
|-----------|-----|-----|-----|--------|
| Revenue growth | | | | |
| Gross margin | | | | |
| S&M as % of rev | | | | |
| Headcount | | | | |

## Sensitivity Analysis

What is the impact on Y3 EBITDA if:
- Revenue grows 20% slower?
- Gross margin drops 5 points?
- Churn increases by 2%?`}]},{id:"finance-pricing-sensitivity",title:"Pricing Sensitivity",description:"Price elasticity analysis and optimal price point discovery",category:"finance",icon:"SlidersHorizontal",cells:[{type:"markdown",content:`# Pricing Sensitivity Analysis

Determine optimal pricing through willingness-to-pay analysis, price elasticity modeling, and competitive benchmarking.`},{type:"ai-prompt",content:"Explain the Van Westendorp Price Sensitivity Meter methodology. How should a [industry] company design a pricing survey to determine: the range of acceptable prices, the optimal price point, and the point of marginal cheapness/expensiveness?"},{type:"code",content:`# Price sensitivity model
import numpy as np

# Simulated survey data (price points and % who would buy)
price_points = [29, 49, 79, 99, 149, 199, 299]
demand_pct = [92, 85, 68, 55, 35, 20, 8]  # % willing to pay
base_customers = 10000

print(f'{"Price":>8} {"Demand":>8} {"Customers":>10} {"Revenue":>12}')
print('-' * 42)

best_revenue = 0
best_price = 0

for price, demand in zip(price_points, demand_pct):
    customers = int(base_customers * demand / 100)
    revenue = price * customers
    if revenue > best_revenue:
        best_revenue = revenue
        best_price = price
    marker = ' <-- optimal' if price == best_price and revenue == best_revenue else ''
    print(f'\${price:>7} {demand:>7}% {customers:>10,} \${revenue:>11,}{marker}')

print(f'\\nOptimal price: \${best_price} (maximizes revenue at \${best_revenue:,})')`},{type:"markdown",content:`## Recommendations

- **Optimal price point:** $[X]/mo
- **Expected conversion impact:** 
- **Revenue impact vs. current pricing:** 
- **Implementation plan:** `}]},{id:"finance-cac-ltv",title:"CAC / LTV Analysis",description:"Acquisition cost vs. lifetime value deep dive with payback",category:"finance",icon:"Scale",cells:[{type:"markdown",content:`# CAC / LTV Analysis

Detailed breakdown of customer acquisition cost and lifetime value by segment and channel. Identify the most efficient growth paths.`},{type:"ai-prompt",content:"Break down CAC calculation for a [industry] company by channel: paid search, paid social, content/SEO, outbound sales, partnerships, and events. For each channel, list the cost components to include (ad spend, salaries, tools, commissions) and typical CAC ranges."},{type:"code",content:`# CAC/LTV by segment
import pandas as pd

segments = pd.DataFrame({
    'Segment': ['Enterprise', 'Mid-Market', 'SMB', 'Self-Serve'],
    'CAC': [15000, 5000, 1200, 250],
    'Monthly_ARPU': [5000, 1500, 200, 50],
    'Gross_Margin': [0.82, 0.80, 0.75, 0.70],
    'Avg_Lifetime_Months': [48, 36, 24, 18],
})

segments['LTV'] = segments['Monthly_ARPU'] * segments['Gross_Margin'] * segments['Avg_Lifetime_Months']
segments['LTV_CAC_Ratio'] = (segments['LTV'] / segments['CAC']).round(1)
segments['Payback_Months'] = (segments['CAC'] / (segments['Monthly_ARPU'] * segments['Gross_Margin'])).round(1)

print(segments.to_markdown(index=False))
print(f"\\nBest LTV:CAC ratio: {segments.loc[segments['LTV_CAC_Ratio'].idxmax(), 'Segment']}")
print(f"Fastest payback: {segments.loc[segments['Payback_Months'].idxmin(), 'Segment']}")`},{type:"markdown",content:`## Strategic Implications

- **Invest more in:** [segment with best LTV:CAC]
- **Optimize:** [segment with longest payback]
- **Watch:** [segment with declining metrics]

## Quarterly Trend

| Quarter | Blended CAC | Blended LTV | LTV:CAC | Payback |
|---------|------------|------------|---------|--------|
| Q1 | | | | |
| Q2 | | | | |
| Q3 | | | | |
| Q4 | | | | |`}]},{id:"research-customer-interviews",title:"Customer Interview Analysis",description:"Synthesize interview themes, insights, and action items",category:"research",icon:"MessageSquare",cells:[{type:"markdown",content:`# Customer Interview Analysis

**Interviews conducted:** [count]
**Period:** [dates]
**Objective:** [research question]

Synthesize qualitative insights from customer interviews into actionable themes.`},{type:"ai-prompt",content:"Provide a framework for analyzing qualitative customer interview data. Cover: how to code responses, identify themes, handle contradictory data, assess theme strength (frequency + intensity), and translate findings into product/marketing actions."},{type:"markdown",content:`## Interview Log

| # | Customer | Segment | Date | Key Quote |
|---|---------|---------|------|----------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |`},{type:"markdown",content:`## Theme Analysis

### Theme 1: [Name]
- **Frequency:** [X] of [Y] interviews
- **Supporting quotes:** 
- **Implication:** 

### Theme 2: [Name]
- **Frequency:** [X] of [Y] interviews
- **Supporting quotes:** 
- **Implication:** `},{type:"markdown",content:`## Action Items

| Insight | Action | Owner | Priority | Impact |
|---------|--------|-------|----------|--------|
| | | | | |
| | | | | |`}]},{id:"research-persona-builder",title:"User Persona Builder",description:"Data-driven persona profiles with behavioral patterns",category:"research",icon:"UserCircle",cells:[{type:"markdown",content:`# User Persona Builder

Create detailed, data-backed user personas to align product, marketing, and sales teams.`},{type:"ai-prompt",content:"Build a detailed user persona for the primary buyer of [product] in [industry]. Include: name and role, demographics, company profile, goals and motivations, pain points and frustrations, buying process, information sources, success metrics, and objections to purchase."},{type:"markdown",content:`## Persona 1: [Name]

**Title:** 
**Company type:** 
**Reports to:** 

### Goals
1. 
2. 
3. 

### Pain Points
1. 
2. 
3. 

### Day in the Life
- Morning: 
- Midday: 
- Afternoon: 

### How They Evaluate Solutions
- Must-haves: 
- Nice-to-haves: 
- Dealbreakers: `},{type:"ai-prompt",content:"Build a secondary user persona -- the day-to-day user (not the buyer) of [product]. How do their needs, goals, and evaluation criteria differ from the buyer persona? What features matter most to them vs. the buyer?"}]},{id:"research-market-sizing",title:"Market Sizing",description:"Top-down and bottom-up market size estimation with triangulation",category:"research",icon:"Maximize",cells:[{type:"markdown",content:`# Market Sizing Analysis

Estimate market size using multiple methodologies and triangulate for confidence.`},{type:"ai-prompt",content:"Estimate the market size for [product/service] using a top-down approach. Start with the broadest relevant market, then narrow by: geography, industry vertical, company size, and product fit. Cite industry reports and data sources."},{type:"ai-prompt",content:"Estimate the market size for [product/service] using a bottom-up approach. Start with: number of potential customers, expected adoption rate, average revenue per customer. Build up from individual customer economics."},{type:"code",content:`# Market sizing triangulation
top_down_tam = 12000000000  # $12B from industry reports
bottom_up_tam = 8500000000   # $8.5B from customer count x ACV
analyst_estimate = 10000000000  # $10B from analyst consensus

avg_tam = (top_down_tam + bottom_up_tam + analyst_estimate) / 3

print('Market Sizing Triangulation')
print(f'  Top-down:       \${top_down_tam/1e9:.1f}B')
print(f'  Bottom-up:      \${bottom_up_tam/1e9:.1f}B')
print(f'  Analyst est.:   \${analyst_estimate/1e9:.1f}B')
print(f'  Average:        \${avg_tam/1e9:.1f}B')
print(f'  Range:          \${min(top_down_tam,bottom_up_tam,analyst_estimate)/1e9:.1f}B - \${max(top_down_tam,bottom_up_tam,analyst_estimate)/1e9:.1f}B')
print(f'\\nConfidence: {"High" if (max(top_down_tam,bottom_up_tam,analyst_estimate) / min(top_down_tam,bottom_up_tam,analyst_estimate)) < 1.5 else "Medium" if (max(top_down_tam,bottom_up_tam,analyst_estimate) / min(top_down_tam,bottom_up_tam,analyst_estimate)) < 2 else "Low"}')`},{type:"markdown",content:`## Data Sources

| Source | Estimate | Year | Notes |
|--------|---------|------|-------|
| | | | |

## Confidence Assessment

- **Strongest estimate:** 
- **Key uncertainties:** 
- **What would change the sizing significantly:** `}]},{id:"research-technology-assessment",title:"Technology Assessment",description:"Evaluate technology landscape and make build/buy recommendations",category:"research",icon:"Cpu",cells:[{type:"markdown",content:`# Technology Assessment

**Technology area:** [area]
**Purpose:** Evaluate options and recommend build vs. buy vs. partner

Structured evaluation of technology options for a specific capability.`},{type:"ai-prompt",content:"Map the technology landscape for [technology area]. Identify the major categories of solutions, leading vendors in each, open-source alternatives, and emerging approaches. Provide a maturity assessment for each."},{type:"markdown",content:`## Evaluation Criteria

| Criterion | Weight | Option A | Option B | Option C |
|-----------|--------|----------|----------|----------|
| Functionality fit | 25% | | | |
| Scalability | 20% | | | |
| Integration ease | 20% | | | |
| Total cost (3yr) | 15% | | | |
| Vendor viability | 10% | | | |
| Time to implement | 10% | | | |
| **Weighted Score** | **100%** | | | |`},{type:"ai-prompt",content:"For [technology capability], compare the build vs. buy tradeoffs. Consider: upfront cost, ongoing maintenance, customization needs, time to value, strategic importance, and team capability. Under what conditions should [company] build vs. buy?"}]},{id:"research-vendor-comparison",title:"Vendor Comparison",description:"Structured vendor evaluation with scoring matrix",category:"research",icon:"GitCompare",cells:[{type:"markdown",content:`# Vendor Comparison

**Category:** [vendor category]
**Decision date:** [date]
**Budget:** $[amount]

Objective evaluation of vendor options for [use case].`},{type:"ai-prompt",content:"Identify the top 5 vendors for [category] in [industry]. For each, provide: company overview, pricing model, key strengths, key weaknesses, ideal customer profile, and notable customers. Include at least one emerging/challenger vendor."},{type:"code",content:`# Vendor scoring matrix
import pandas as pd

criteria = [
    ('Feature completeness', 0.25),
    ('Ease of integration', 0.20),
    ('Price/value', 0.20),
    ('Support quality', 0.15),
    ('Scalability', 0.10),
    ('Vendor stability', 0.10),
]

# Scores out of 10
vendors = {
    'Vendor A': [8, 7, 6, 8, 9, 9],
    'Vendor B': [7, 9, 8, 7, 7, 8],
    'Vendor C': [9, 6, 5, 6, 8, 7],
}

print(f'{"Criterion":<25} {"Weight":<8}', end='')
for v in vendors:
    print(f' {v:<12}', end='')
print()
print('-' * 70)

totals = {v: 0 for v in vendors}
for i, (crit, weight) in enumerate(criteria):
    print(f'{crit:<25} {weight:<8.0%}', end='')
    for v, scores in vendors.items():
        weighted = scores[i] * weight
        totals[v] += weighted
        print(f' {scores[i]:<12}', end='')
    print()

print('-' * 70)
print(f'{"WEIGHTED TOTAL":<33}', end='')
for v in vendors:
    print(f' {totals[v]:<12.1f}', end='')
print(f'\\n\\nRecommendation: {max(totals, key=totals.get)}')`},{type:"markdown",content:`## Recommendation

**Selected vendor:** 
**Rationale:** 
**Risks and mitigations:** 
**Next steps:** 
1. 
2. 
3. `}]},{id:"research-survey-analysis",title:"Survey Analysis",description:"Survey response synthesis with statistical analysis",category:"research",icon:"ClipboardCheck",cells:[{type:"markdown",content:`# Survey Analysis

**Survey:** [name]
**Respondents:** [count]
**Period:** [dates]
**Response rate:** [X]%

Analyze survey responses to extract actionable insights.`},{type:"ai-prompt",content:"Provide a framework for analyzing a [customer satisfaction / market research / product feedback] survey with [X] responses. Cover: data cleaning steps, statistical tests to run, how to handle open-ended responses, and how to present findings to stakeholders."},{type:"code",content:`# Survey analysis template
import pandas as pd
import numpy as np

# Simulated Likert scale data
np.random.seed(42)
n_responses = 200

data = pd.DataFrame({
    'Overall_Satisfaction': np.random.choice([1,2,3,4,5], n_responses, p=[0.05,0.10,0.20,0.40,0.25]),
    'Ease_of_Use': np.random.choice([1,2,3,4,5], n_responses, p=[0.03,0.08,0.25,0.38,0.26]),
    'Value_for_Money': np.random.choice([1,2,3,4,5], n_responses, p=[0.08,0.15,0.30,0.30,0.17]),
    'Likely_to_Recommend': np.random.choice([0,1,2,3,4,5,6,7,8,9,10], n_responses),
})

print('Survey Results Summary')
print('=' * 40)
for col in ['Overall_Satisfaction', 'Ease_of_Use', 'Value_for_Money']:
    print(f'\\n{col.replace("_", " ")}:')
    print(f'  Mean: {data[col].mean():.2f} / 5.00')
    print(f'  Median: {data[col].median():.1f}')
    print(f'  % Positive (4-5): {(data[col] >= 4).mean()*100:.0f}%')

# NPS calculation
promoters = (data['Likely_to_Recommend'] >= 9).sum()
detractors = (data['Likely_to_Recommend'] <= 6).sum()
nps = (promoters - detractors) / n_responses * 100
print(f'\\nNPS: {nps:.0f}')`},{type:"markdown",content:`## Key Findings

1. 
2. 
3. 

## Segment Differences

| Segment | Satisfaction | NPS | Key Difference |
|---------|------------|-----|----------------|
| | | | |

## Recommended Actions

| Finding | Action | Priority | Owner |
|---------|--------|----------|-------|
| | | | |`}]},{id:"research-trend-radar",title:"Trend Radar",description:"Map emerging trends by impact and timeline to adoption",category:"research",icon:"Radar",cells:[{type:"markdown",content:`# Trend Radar

**Industry:** [industry]
**Horizon:** 1-5 years

Map emerging trends and technologies by proximity to mainstream adoption and potential impact.`},{type:"ai-prompt",content:"Identify 15-20 emerging trends affecting [industry] over the next 1-5 years. For each, classify into: Adopt (ready now), Trial (experiment next 6-12 months), Assess (watch next 1-2 years), or Hold (2-5 years out). Include technology, business model, and regulatory trends."},{type:"markdown",content:`## Trend Radar

### Adopt (Now)
| Trend | Impact | Our Readiness | Action |
|-------|--------|--------------|--------|
| | | | |

### Trial (6-12 months)
| Trend | Impact | Our Readiness | Action |
|-------|--------|--------------|--------|
| | | | |

### Assess (1-2 years)
| Trend | Impact | Our Readiness | Action |
|-------|--------|--------------|--------|
| | | | |

### Hold (2-5 years)
| Trend | Impact | Our Readiness | Action |
|-------|--------|--------------|--------|
| | | | |`},{type:"ai-prompt",content:"For the top 5 most impactful trends on the radar, provide a deeper analysis: driving forces, early signals of acceleration, potential impact on [company]'s business model, and what we should do now to prepare."}]},{id:"research-patent-landscape",title:"Patent Landscape",description:"Patent analysis to identify key players and whitespace",category:"research",icon:"FileKey",cells:[{type:"markdown",content:`# Patent Landscape Analysis

**Technology area:** [area]
**Search scope:** [geographies, date range]

Map the intellectual property landscape to identify key players, trends, and whitespace opportunities.`},{type:"ai-prompt",content:"Analyze the patent landscape for [technology area]. Identify: top patent holders (by volume), recent filing trends, key patent clusters, and geographic distribution. Highlight any foundational patents that could affect freedom to operate."},{type:"markdown",content:`## Key Players

| Company | Patent Count | Focus Areas | Notable Patents |
|---------|-------------|-------------|----------------|
| | | | |

## Whitespace Analysis

Areas with low patent density that represent opportunities:
1. 
2. 
3. 

## Freedom to Operate Assessment

- **High risk areas:** 
- **Medium risk areas:** 
- **Clear areas:** `},{type:"ai-prompt",content:"Based on the patent landscape for [technology area], recommend 3-5 areas where [company] should consider filing patents to protect its competitive position. For each, explain the strategic rationale and estimated filing cost."}]},{id:"research-regulatory-scan",title:"Regulatory Scan",description:"Regulatory environment overview with compliance requirements",category:"research",icon:"Scale",cells:[{type:"markdown",content:`# Regulatory Scan

**Industry:** [industry]
**Jurisdictions:** [geographies]
**Date:** [date]

Comprehensive scan of the regulatory environment affecting [company/product].`},{type:"ai-prompt",content:"Provide an overview of the regulatory landscape affecting [industry] in [jurisdictions]. Cover: existing regulations, pending legislation, enforcement trends, and expected changes in the next 12-24 months. Highlight any regulations that could significantly impact [company]'s business model."},{type:"markdown",content:`## Compliance Requirements

| Regulation | Jurisdiction | Applies To | Compliance Deadline | Status |
|-----------|-------------|-----------|--------------------|---------|
| | | | | |

## Impact Assessment

| Regulatory Change | Probability | Impact | Preparedness | Action Needed |
|------------------|------------|--------|-------------|---------------|
| | | | | |`},{type:"ai-prompt",content:"What are the top 3 regulatory risks for [company] in the next 24 months? For each, provide: the specific regulation, likelihood of enforcement, potential impact (revenue, operations, product), and recommended mitigation steps."}]},{id:"research-literature-review",title:"Academic Literature Review",description:"Systematic review of research papers and methodology gaps",category:"research",icon:"BookOpen",cells:[{type:"markdown",content:`# Academic Literature Review

**Topic:** [research topic]
**Search scope:** [databases, date range]
**Research question:** [specific question]

Systematic review of academic and industry research.`},{type:"ai-prompt",content:"Conduct a literature review on [topic]. Identify the top 10-15 most cited and relevant papers from the past 5 years. For each, provide: authors, year, key findings, methodology, and relevance to [research question]. Organize by theme."},{type:"markdown",content:`## Theme 1: [Name]

| Paper | Authors (Year) | Key Finding | Methodology | Relevance |
|-------|---------------|-------------|-------------|----------|
| | | | | |

## Theme 2: [Name]

| Paper | Authors (Year) | Key Finding | Methodology | Relevance |
|-------|---------------|-------------|-------------|----------|
| | | | | |`},{type:"markdown",content:`## Methodology Assessment

- **Most rigorous studies:** 
- **Common limitations:** 
- **Gaps in the literature:** 

## Implications for [Company/Product]

1. 
2. 
3. `},{type:"ai-prompt",content:"Based on the literature review on [topic], identify the 3 biggest gaps in current research that represent opportunities for [company] to generate proprietary insights. What data or experiments would be needed to fill these gaps?"}]}];function Ge(i){return i==="all"?C:C.filter(m=>m.category===i)}function He(i,m="all"){const d=Ge(m);if(!i)return d;const a=i.toLowerCase();return d.filter(v=>v.title.toLowerCase().includes(a)||v.description.toLowerCase().includes(a))}const Ue={Sparkles:E,FileBarChart:Ke,CalendarDays:Ve,Megaphone:We,Globe:De,Target:$e,Shield:ze,TrendingUp:Oe,BarChart3:Ee,Link:Le,Rocket:Be,Eye:Fe,MessageCircle:Ie,Newspaper:je,PieChart:Ne,Heart:Te,DollarSign:Me,GitBranch:Pe,Palette:Re,Filter:Ae,Users:Se,Mail:_e,Calculator:Ce,ClipboardList:xe,Coins:ke,Flame:we,FileSpreadsheet:be,SlidersHorizontal:fe,Scale:ve,MessageSquare:ge,UserCircle:he,Maximize:ye,Cpu:ue,GitCompare:me,ClipboardCheck:pe,Radar:le,FileKey:de,BookOpen:ce,LayoutGrid:x,Waves:se,Crosshair:ie,Sunrise:oe};function Ye(i){return Ue[i]||E}const Qe={strategy:"bg-indigo-100 text-indigo-700",intelligence:"bg-amber-100 text-amber-700",marketing:"bg-emerald-100 text-emerald-700",finance:"bg-rose-100 text-rose-700",research:"bg-sky-100 text-sky-700"};function rt(){const[,i]=Q(),m=X(),{toast:d}=te(),[a,v]=c.useState("all"),[u,O]=c.useState(""),[_,z]=c.useState("edited"),[f,S]=c.useState([]),[b,A]=c.useState("grid"),[p,$]=c.useState(()=>{try{return new Set(JSON.parse(localStorage.getItem("stratix:favorites")||"[]"))}catch{return new Set}}),[R,D]=c.useState("all"),[P,W]=c.useState(""),[y,h]=c.useState(null),M=He(P,R),{data:T=[],isError:V,refetch:K}=J(),q=Z();c.useEffect(()=>{fetch("/api/notebooks",{credentials:"include"}).then(t=>t.ok?t.json():[]).then(t=>S(Array.isArray(t)?t:[])).catch(()=>S([]))},[]),c.useEffect(()=>{try{localStorage.setItem("stratix:favorites",JSON.stringify([...p]))}catch{}},[p]);const G=Array.isArray(T)?T:[],H=Array.isArray(f)?f:[],g=[...a==="all"||a==="notebooks"||a==="favorites"?H.map(t=>({...t,kind:"notebook",href:`/build/notebooks/${t.id}`})):[],...a==="all"||a==="boards"||a==="favorites"?G.map(t=>({...t,kind:"board",cellCount:0,href:`/build/boards/${t.id}`})):[]].filter(t=>{const n=p.has(`${t.kind}-${t.id}`);return a==="favorites"?n&&(!u||t.title.toLowerCase().includes(u.toLowerCase())):!u||t.title.toLowerCase().includes(u.toLowerCase())}).sort((t,n)=>_==="name"?t.title.localeCompare(n.title):new Date(n.updatedAt).getTime()-new Date(t.updatedAt).getTime()),N=(t,n)=>{const r=`${t}-${n}`,o=new Set(p);o.has(r)?o.delete(r):o.add(r),$(o)},U=async()=>{try{const t="Untitled Notebook",n=new Set(f.map(s=>s.title));let r=t;if(n.has(t)){let s=2;for(;n.has(`${t} ${s}`);)s++;r=`${t} ${s}`}const o=await fetch("/api/notebooks",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({title:r,description:""})});if(o.ok){const s=await o.json();i(`/build/notebooks/${s.id}`)}}catch{d({title:"Failed to create notebook",variant:"destructive"})}},Y=()=>{q.mutate({data:{title:"Untitled Board",type:"live"}},{onSuccess:t=>{m.invalidateQueries({queryKey:ee()}),i(`/build/boards/${t.id}`)},onError:()=>{d({title:"Failed to create board",variant:"destructive"})}})},j=async t=>{try{const n=t.title,r=new Set(f.map(l=>l.title));let o=n;if(r.has(n)){let l=2;for(;r.has(`${n} ${l}`);)l++;o=`${n} ${l}`}const s=await fetch("/api/notebooks",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({title:o,description:t.description})});if(!s.ok){d({title:"Failed to create notebook",variant:"destructive"});return}const I=await s.json();for(const l of t.cells)await fetch(`/api/notebooks/${I.id}/cells`,{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({type:l.type,content:l.content})});d({title:"Template applied",description:`Created "${o}" with ${t.cells.length} cells`}),i(`/build/notebooks/${I.id}`)}catch{d({title:"Failed to apply template",variant:"destructive"})}};return e.jsxs("div",{children:[e.jsx("h1",{className:"font-editorial text-[28px] font-medium text-[var(--text-primary)]",children:"Build"}),e.jsxs("div",{className:"flex items-center justify-between mt-6 gap-4",children:[e.jsxs("div",{className:"relative flex-1 max-w-sm",children:[e.jsx(w,{className:"absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]"}),e.jsx("input",{value:u,onChange:t=>O(t.target.value),placeholder:"Search...",className:"w-full pl-10 pr-4 h-9 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-body-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"})]}),e.jsxs("div",{className:"flex items-center gap-4",children:[e.jsx("div",{className:"flex items-center gap-1",children:["all","notebooks","boards","favorites"].map(t=>e.jsx("button",{onClick:()=>v(t),className:`px-3 py-1.5 text-body-sm rounded-[var(--radius-sm)] transition-colors ${a===t?"text-[var(--text-primary)] font-medium bg-[var(--surface)]":"text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`,children:t==="favorites"?"Favorites":t.charAt(0).toUpperCase()+t.slice(1)},t))}),e.jsxs("select",{value:_,onChange:t=>z(t.target.value),className:"h-9 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-body-sm text-[var(--text-secondary)]",children:[e.jsx("option",{value:"edited",children:"Last edited"}),e.jsx("option",{value:"name",children:"Name A-Z"})]}),e.jsxs("div",{className:"flex items-center gap-1 border-l border-[var(--border)] pl-4",children:[e.jsx("button",{onClick:()=>A("grid"),className:`p-2 rounded-[var(--radius-sm)] transition-colors ${b==="grid"?"bg-[var(--surface)] text-[var(--text-primary)]":"text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`,children:e.jsx(ne,{className:"h-4 w-4"})}),e.jsx("button",{onClick:()=>A("list"),className:`p-2 rounded-[var(--radius-sm)] transition-colors ${b==="list"?"bg-[var(--surface)] text-[var(--text-primary)]":"text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`,children:e.jsx(ae,{className:"h-4 w-4"})})]})]})]}),V&&e.jsxs("div",{className:"flex items-center justify-between mt-6 px-4 py-3 rounded-[var(--radius-md)] bg-[var(--error-muted)] border border-[var(--error)]/20",children:[e.jsx("p",{className:"text-body-sm text-[var(--error)]",children:"Failed to load boards. The server returned an error."}),e.jsx("button",{onClick:()=>K(),className:"ml-4 shrink-0 px-3 py-1.5 text-body-sm font-medium rounded-[var(--radius-sm)] bg-[var(--accent)] text-white hover:opacity-90 transition-opacity",children:"Retry"})]}),(a==="all"||a==="notebooks")&&e.jsxs("div",{className:"mt-8 mb-8",children:[e.jsx("div",{className:"flex items-center justify-between mb-4",children:e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("h2",{className:"text-[18px] font-medium text-[var(--text-primary)]",children:"Start from Template"}),e.jsxs("span",{className:"px-2.5 py-0.5 text-[11px] font-medium rounded-full bg-[var(--accent)]/10 text-[var(--accent)]",children:[C.length,"+ templates"]})]})}),e.jsx("div",{className:"flex items-center gap-2 mb-4",children:qe.map(t=>e.jsx("button",{onClick:()=>D(t.key),className:`px-3 py-1.5 text-body-sm rounded-[var(--radius-sm)] transition-colors ${R===t.key?"text-[var(--text-primary)] font-medium bg-[var(--surface)] border border-[var(--border-strong)]":"text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-transparent"}`,children:t.label},t.key))}),e.jsxs("div",{className:"relative max-w-xs mb-4",children:[e.jsx(w,{className:"absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]"}),e.jsx("input",{value:P,onChange:t=>W(t.target.value),placeholder:"Filter templates...",className:"w-full pl-10 pr-4 h-9 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] text-body-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"})]}),e.jsx("div",{className:"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4",children:M.map(t=>{const n=Ye(t.icon);return e.jsxs("div",{className:"flex flex-col rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-elevated)] transition-all overflow-hidden group",children:[e.jsxs("div",{className:"flex-1 flex items-center justify-center bg-[var(--surface-secondary)] py-6 relative",children:[e.jsx(n,{className:"h-8 w-8 text-[var(--accent)]"}),e.jsx("button",{onClick:()=>h(t),className:"absolute top-2 right-2 px-2 py-1 text-[10px] font-medium rounded-[var(--radius-sm)] bg-white/80 hover:bg-white text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-all",children:"Preview"})]}),e.jsxs("div",{className:"px-3 py-3",children:[e.jsx("div",{className:"flex items-center gap-2 mb-1",children:e.jsx("p",{className:"text-body-sm font-medium text-[var(--text-primary)] truncate",children:t.title})}),e.jsx("p",{className:"text-[11px] text-[var(--text-muted)] mt-0.5 line-clamp-2",children:t.description}),e.jsxs("div",{className:"flex items-center justify-between mt-2",children:[e.jsx("span",{className:`px-2 py-0.5 text-[10px] font-medium rounded-full ${Qe[t.category]}`,children:t.category}),e.jsxs("span",{className:"text-[10px] text-[var(--text-muted)]",children:[t.cells.length," cells"]})]}),e.jsx("button",{onClick:()=>j(t),className:"mt-3 w-full px-3 py-1.5 text-[11px] font-medium rounded-[var(--radius-sm)] bg-[var(--accent)] text-white hover:opacity-90 transition-opacity",children:"Use Template"})]})]},t.id)})}),M.length===0&&e.jsxs("div",{className:"flex flex-col items-center py-8 text-center",children:[e.jsx(w,{className:"h-8 w-8 text-[var(--text-muted)] mb-2"}),e.jsx("p",{className:"text-body-sm text-[var(--text-muted)]",children:"No templates match your search."})]})]}),y&&e.jsx("div",{className:"fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm",onClick:()=>h(null),children:e.jsxs("div",{className:"relative w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg)] shadow-2xl mx-4",onClick:t=>t.stopPropagation(),children:[e.jsxs("div",{className:"sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--bg)]",children:[e.jsxs("div",{children:[e.jsx("h3",{className:"text-[18px] font-medium text-[var(--text-primary)]",children:y.title}),e.jsx("p",{className:"text-body-sm text-[var(--text-muted)] mt-0.5",children:y.description})]}),e.jsx("button",{onClick:()=>h(null),className:"p-2 rounded-[var(--radius-sm)] hover:bg-[var(--surface-secondary)] transition-colors",children:e.jsx(re,{className:"h-5 w-5 text-[var(--text-muted)]"})})]}),e.jsx("div",{className:"px-6 py-4 space-y-3",children:y.cells.map((t,n)=>e.jsxs("div",{className:"rounded-[var(--radius-md)] border border-[var(--border)] overflow-hidden",children:[e.jsxs("div",{className:"flex items-center gap-2 px-3 py-1.5 bg-[var(--surface-secondary)] border-b border-[var(--border)]",children:[e.jsx("span",{className:`px-2 py-0.5 text-[10px] font-medium rounded-full ${t.type==="markdown"?"bg-blue-100 text-blue-700":t.type==="ai-prompt"?"bg-purple-100 text-purple-700":"bg-green-100 text-green-700"}`,children:t.type==="ai-prompt"?"AI Prompt":t.type==="markdown"?"Markdown":"Code"}),e.jsxs("span",{className:"text-[10px] text-[var(--text-muted)]",children:["Cell ",n+1]})]}),e.jsx("pre",{className:"px-3 py-2.5 text-[12px] text-[var(--text-secondary)] whitespace-pre-wrap font-mono leading-relaxed max-h-40 overflow-y-auto bg-[var(--surface)]",children:t.content})]},n))}),e.jsxs("div",{className:"sticky bottom-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--border)] bg-[var(--bg)]",children:[e.jsx("button",{onClick:()=>h(null),className:"px-4 py-2 text-body-sm rounded-[var(--radius-sm)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] transition-colors",children:"Close"}),e.jsx("button",{onClick:()=>{j(y),h(null)},className:"px-4 py-2 text-body-sm font-medium rounded-[var(--radius-sm)] bg-[var(--accent)] text-white hover:opacity-90 transition-opacity",children:"Use Template"})]})]})}),g.length===0&&e.jsxs("div",{className:"flex flex-col items-center justify-center mt-12 py-12",children:[e.jsx("div",{className:"w-24 h-24 rounded-full bg-[var(--surface-secondary)] flex items-center justify-center mb-4",children:e.jsx(k,{className:"h-12 w-12 text-[var(--text-muted)]"})}),e.jsx("p",{className:"text-body-md text-[var(--text-secondary)] mt-2",children:"Your workspace is empty."}),e.jsx("p",{className:"text-body-sm text-[var(--text-muted)] mt-1",children:"Create a notebook or board, or start from a template."})]}),g.length>0&&b==="grid"&&e.jsxs("div",{className:"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-6",children:[(a==="all"||a==="notebooks")&&e.jsxs("button",{onClick:U,className:"flex flex-col items-center justify-center h-40 rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--border)] hover:border-[var(--border-strong)] transition-colors",children:[e.jsx(B,{className:"h-6 w-6 text-[var(--text-muted)] mb-2"}),e.jsx("span",{className:"text-body-sm text-[var(--text-primary)]",children:"New Notebook"})]}),(a==="all"||a==="boards")&&e.jsxs("button",{onClick:Y,className:"flex flex-col items-center justify-center h-40 rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--border)] hover:border-[var(--border-strong)] transition-colors",children:[e.jsx(B,{className:"h-6 w-6 text-[var(--text-muted)] mb-2"}),e.jsx("span",{className:"text-body-sm text-[var(--text-primary)]",children:"New Board"})]}),g.map(t=>{const n=t.kind==="notebook"?k:x,r=`${t.kind}-${t.id}`,o=p.has(r);return e.jsxs("div",{className:"flex flex-col h-40 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-elevated)] hover:shadow-md transition-all overflow-hidden group",children:[e.jsxs("div",{className:"flex-1 flex items-center justify-center bg-[var(--surface-secondary)] relative cursor-pointer",onClick:()=>i(t.href),children:[e.jsx(n,{className:"h-8 w-8 text-[var(--border-strong)]"}),e.jsx("button",{onClick:s=>{s.stopPropagation(),N(t.kind,t.id)},className:"absolute top-2 right-2 p-1.5 rounded-[var(--radius-sm)] bg-white/80 hover:bg-white transition-all opacity-0 group-hover:opacity-100",children:e.jsx(L,{className:`h-4 w-4 ${o?"fill-[var(--accent)] text-[var(--accent)]":"text-[var(--text-muted)]"}`})})]}),e.jsxs("div",{className:"px-3 py-2.5 cursor-pointer",onClick:()=>i(t.href),children:[e.jsx("p",{className:"text-body-sm font-medium text-[var(--text-primary)] truncate",children:t.title}),e.jsx("p",{className:"text-[11px] text-[var(--text-muted)] mt-0.5",children:F(new Date(t.updatedAt),"MMM d, yyyy")})]})]},r)})]}),g.length>0&&b==="list"&&e.jsx("div",{className:"space-y-2 mt-6",children:g.map(t=>{const n=t.kind==="notebook"?k:x,r=`${t.kind}-${t.id}`,o=p.has(r);return e.jsxs("div",{onClick:()=>i(t.href),className:"flex items-center gap-4 px-4 py-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-elevated)] transition-all cursor-pointer group",children:[e.jsx(n,{className:"h-5 w-5 text-[var(--border-strong)] shrink-0"}),e.jsxs("div",{className:"flex-1",children:[e.jsx("p",{className:"text-body-sm font-medium text-[var(--text-primary)]",children:t.title}),e.jsx("p",{className:"text-[11px] text-[var(--text-muted)]",children:F(new Date(t.updatedAt),"MMM d, yyyy")})]}),e.jsx("button",{onClick:s=>{s.stopPropagation(),N(t.kind,t.id)},className:"p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--surface-secondary)] transition-all opacity-0 group-hover:opacity-100",children:e.jsx(L,{className:`h-4 w-4 ${o?"fill-[var(--accent)] text-[var(--accent)]":"text-[var(--text-muted)]"}`})})]},r)})})]})}export{rt as Build};

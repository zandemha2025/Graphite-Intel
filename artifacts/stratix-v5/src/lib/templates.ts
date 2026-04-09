export type TemplateCategory = "strategy" | "intelligence" | "marketing" | "finance" | "research";

export interface TemplateCell {
  type: "markdown" | "code" | "ai-prompt";
  content: string;
}

export interface Template {
  id: string;
  title: string;
  description: string;
  category: TemplateCategory;
  icon: string;
  cells: TemplateCell[];
}

export const TEMPLATE_CATEGORIES: { key: TemplateCategory | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "strategy", label: "Strategy" },
  { key: "intelligence", label: "Intelligence" },
  { key: "marketing", label: "Marketing" },
  { key: "finance", label: "Finance" },
  { key: "research", label: "Research" },
];

export const TEMPLATES: Template[] = [
  // ---------------------------------------------------------------------------
  // STRATEGY (12)
  // ---------------------------------------------------------------------------
  {
    id: "strategy-competitive-analysis",
    title: "Competitive Analysis",
    description: "Deep-dive into competitor positioning, strengths, and gaps",
    category: "strategy",
    icon: "Sparkles",
    cells: [
      { type: "markdown", content: "# Competitive Analysis\n\nUse this notebook to map the competitive landscape, identify differentiation opportunities, and track competitor moves over time." },
      { type: "markdown", content: "## Competitors\n\nList your primary and secondary competitors below. Include direct competitors (same product category) and indirect competitors (alternative solutions).\n\n| Competitor | Category | Est. Revenue | Key Differentiator |\n|-----------|----------|-------------|--------------------|\n| | | | |\n| | | | |" },
      { type: "ai-prompt", content: "Analyze the competitive landscape for [company] in [industry]. Identify the top 5-7 competitors, their market positioning, pricing tiers, key features, and recent strategic moves. Highlight gaps and whitespace opportunities." },
      { type: "code", content: "# Competitor comparison data table\nimport pandas as pd\n\ncompetitors = pd.DataFrame({\n    'Company': ['Competitor A', 'Competitor B', 'Competitor C'],\n    'Market_Share_Pct': [25, 18, 12],\n    'Pricing_Tier': ['Enterprise', 'Mid-Market', 'SMB'],\n    'NPS_Score': [42, 38, 55],\n    'YoY_Growth_Pct': [15, 22, 35]\n})\n\nprint(competitors.to_markdown(index=False))" },
      { type: "markdown", content: "## Key Takeaways\n\n- **Biggest threat:**\n- **Biggest opportunity:**\n- **Recommended actions:**" },
    ],
  },
  {
    id: "strategy-market-entry",
    title: "Market Entry Strategy",
    description: "Framework for evaluating and planning entry into a new market",
    category: "strategy",
    icon: "Globe",
    cells: [
      { type: "markdown", content: "# Market Entry Strategy\n\nStructured analysis for entering a new geographic or vertical market. Covers market attractiveness, entry barriers, and go-to-market sequencing." },
      { type: "ai-prompt", content: "Provide a market overview for [target market/geography]. Include market size (TAM), growth rate, key players, regulatory environment, and cultural considerations that affect B2B SaaS adoption." },
      { type: "markdown", content: "## Entry Barriers\n\n| Barrier | Severity (1-5) | Mitigation Strategy |\n|--------|---------------|---------------------|\n| Regulatory compliance | | |\n| Local competition | | |\n| Distribution channels | | |\n| Brand awareness | | |\n| Talent availability | | |" },
      { type: "ai-prompt", content: "Outline a phased go-to-market plan for [company] entering [target market]. Include: Phase 1 (validation, 0-3 months), Phase 2 (early traction, 3-9 months), Phase 3 (scale, 9-18 months). For each phase, specify channels, partnerships, hiring, and success metrics." },
      { type: "markdown", content: "## Decision Matrix\n\nGo / No-Go criteria:\n- [ ] Market size exceeds $[X]M\n- [ ] Regulatory path is clear\n- [ ] At least 2 potential channel partners identified\n- [ ] Payback period under 18 months" },
    ],
  },
  {
    id: "strategy-swot",
    title: "SWOT Analysis",
    description: "Structured strengths, weaknesses, opportunities, and threats assessment",
    category: "strategy",
    icon: "Target",
    cells: [
      { type: "markdown", content: "# SWOT Analysis\n\nA comprehensive assessment of internal strengths/weaknesses and external opportunities/threats for [company/product/initiative]." },
      { type: "ai-prompt", content: "Identify the top 5 strengths of [company] in [industry]. Consider brand equity, technology, talent, IP, distribution, and customer relationships. Rank them by strategic importance." },
      { type: "ai-prompt", content: "Identify the top 5 weaknesses of [company]. Consider resource constraints, technical debt, market perception, talent gaps, and operational inefficiencies. Be candid and specific." },
      { type: "ai-prompt", content: "Identify the top 5 market opportunities for [company]. Consider emerging trends, underserved segments, regulatory changes, technology shifts, and partnership possibilities." },
      { type: "ai-prompt", content: "Identify the top 5 threats facing [company]. Consider competitive moves, market shifts, regulatory risks, macroeconomic factors, and technology disruption." },
      { type: "markdown", content: "## Strategic Implications\n\n**Leverage (Strengths x Opportunities):**\n\n**Defend (Strengths x Threats):**\n\n**Improve (Weaknesses x Opportunities):**\n\n**Avoid (Weaknesses x Threats):**" },
    ],
  },
  {
    id: "strategy-porters-five",
    title: "Porter's Five Forces",
    description: "Industry structure analysis using Porter's competitive framework",
    category: "strategy",
    icon: "Shield",
    cells: [
      { type: "markdown", content: "# Porter's Five Forces Analysis\n\nEvaluate the competitive intensity and attractiveness of [industry] using Michael Porter's framework." },
      { type: "ai-prompt", content: "Analyze the threat of new entrants in [industry]. Consider capital requirements, economies of scale, brand loyalty, switching costs, regulatory barriers, and access to distribution channels. Rate the threat level (Low/Medium/High)." },
      { type: "ai-prompt", content: "Analyze the bargaining power of suppliers in [industry]. Consider supplier concentration, uniqueness of inputs, switching costs, and forward integration threats. Rate the power level (Low/Medium/High)." },
      { type: "ai-prompt", content: "Analyze the bargaining power of buyers in [industry]. Consider buyer concentration, price sensitivity, product differentiation, switching costs, and backward integration threats. Rate the power level (Low/Medium/High)." },
      { type: "ai-prompt", content: "Analyze the threat of substitute products or services in [industry]. Consider price-performance tradeoffs, switching costs, and buyer propensity to substitute. Rate the threat level (Low/Medium/High)." },
      { type: "ai-prompt", content: "Analyze the intensity of competitive rivalry in [industry]. Consider number of competitors, industry growth rate, product differentiation, exit barriers, and fixed costs. Rate the rivalry level (Low/Medium/High)." },
      { type: "markdown", content: "## Summary\n\n| Force | Rating | Key Drivers |\n|-------|--------|-------------|\n| New Entrants | | |\n| Supplier Power | | |\n| Buyer Power | | |\n| Substitutes | | |\n| Rivalry | | |\n\n**Overall industry attractiveness:**" },
    ],
  },
  {
    id: "strategy-blue-ocean",
    title: "Blue Ocean Strategy",
    description: "Identify uncontested market space with value innovation",
    category: "strategy",
    icon: "Waves",
    cells: [
      { type: "markdown", content: "# Blue Ocean Strategy\n\nMove beyond competing in existing market space. Map the current value curve, then apply the Four Actions Framework to create uncontested space." },
      { type: "ai-prompt", content: "Map the value curve for [industry]. Identify the 8-12 key factors that companies compete on (e.g., price, features, support, brand, speed). Rate the typical industry offering on each factor (1-10). Then rate [company] on the same factors." },
      { type: "markdown", content: "## Four Actions Framework\n\n**Eliminate:** Which factors that the industry takes for granted should be eliminated?\n\n**Reduce:** Which factors should be reduced well below the industry standard?\n\n**Raise:** Which factors should be raised well above the industry standard?\n\n**Create:** Which factors should be created that the industry has never offered?" },
      { type: "code", content: "# Value curve visualization\nimport matplotlib.pyplot as plt\nimport numpy as np\n\nfactors = ['Price', 'Features', 'Support', 'Speed', 'UX', 'Integration', 'AI/ML', 'Customization']\nindustry_avg = [7, 8, 6, 5, 5, 4, 3, 6]\nyour_company = [5, 6, 8, 8, 9, 9, 9, 4]\n\nx = np.arange(len(factors))\nplt.figure(figsize=(10, 5))\nplt.plot(x, industry_avg, 'o--', label='Industry Average', color='gray')\nplt.plot(x, your_company, 'o-', label='Your Strategy', color='#4F46E5')\nplt.xticks(x, factors, rotation=45)\nplt.ylabel('Investment Level')\nplt.title('Strategy Canvas')\nplt.legend()\nplt.tight_layout()\nplt.show()" },
    ],
  },
  {
    id: "strategy-tam-sam-som",
    title: "TAM / SAM / SOM",
    description: "Market sizing from total addressable to serviceable obtainable",
    category: "strategy",
    icon: "BarChart3",
    cells: [
      { type: "markdown", content: "# TAM / SAM / SOM Analysis\n\nSize the market opportunity from top-down and bottom-up perspectives. Use this to validate product-market fit and inform fundraising narratives." },
      { type: "ai-prompt", content: "Estimate the Total Addressable Market (TAM) for [product/service] in [industry]. Use a top-down approach: identify the total number of potential customers globally, average revenue per customer, and total market value. Cite data sources." },
      { type: "ai-prompt", content: "Estimate the Serviceable Addressable Market (SAM) for [product/service]. Narrow TAM by geographic focus, customer segment, and product fit. What percentage of TAM is realistically reachable with current capabilities?" },
      { type: "code", content: "# Market sizing calculation\ntam_customers = 500000  # Total potential customers globally\navg_contract_value = 24000  # Annual contract value ($)\ntam = tam_customers * avg_contract_value\n\nsam_pct = 0.15  # % of TAM serviceable\nsam = tam * sam_pct\n\nsom_pct = 0.05  # % of SAM obtainable in 3 years\nsom = sam * som_pct\n\nprint(f'TAM: ${tam:,.0f}')\nprint(f'SAM: ${sam:,.0f} ({sam_pct*100:.0f}% of TAM)')\nprint(f'SOM: ${som:,.0f} ({som_pct*100:.0f}% of SAM)')\nprint(f'\\nImplied 3-year ARR target: ${som:,.0f}')" },
      { type: "markdown", content: "## Assumptions & Validation\n\n| Assumption | Source | Confidence |\n|-----------|--------|------------|\n| Total customers | | |\n| ACV | | |\n| SAM % | | |\n| SOM % | | |" },
    ],
  },
  {
    id: "strategy-positioning-map",
    title: "Positioning Map",
    description: "Plot competitors on a 2D perceptual map to find whitespace",
    category: "strategy",
    icon: "Crosshair",
    cells: [
      { type: "markdown", content: "# Competitive Positioning Map\n\nVisualize where competitors sit on key dimensions to identify positioning whitespace and differentiation opportunities." },
      { type: "ai-prompt", content: "Identify the two most important competitive dimensions in [industry] (e.g., price vs. sophistication, breadth vs. depth, enterprise vs. SMB). Then plot the top 8-10 competitors on these dimensions with brief rationale." },
      { type: "code", content: "# Positioning map visualization\nimport matplotlib.pyplot as plt\n\ncompanies = {\n    'Competitor A': (8, 7),\n    'Competitor B': (3, 8),\n    'Competitor C': (6, 4),\n    'Competitor D': (2, 3),\n    'Your Company': (7, 9),\n}\n\nfig, ax = plt.subplots(figsize=(8, 8))\nfor name, (x, y) in companies.items():\n    color = '#4F46E5' if name == 'Your Company' else '#94A3B8'\n    ax.scatter(x, y, s=200, c=color, zorder=5)\n    ax.annotate(name, (x, y), textcoords='offset points', xytext=(10, 10))\n\nax.set_xlabel('Dimension 1 (e.g., Price Level)')\nax.set_ylabel('Dimension 2 (e.g., Sophistication)')\nax.set_xlim(0, 10)\nax.set_ylim(0, 10)\nax.set_title('Competitive Positioning Map')\nax.grid(True, alpha=0.3)\nplt.tight_layout()\nplt.show()" },
      { type: "markdown", content: "## Positioning Implications\n\n- **Current position:** Where do we sit today?\n- **Desired position:** Where do we want to be in 12 months?\n- **Moves required:** What product/marketing changes get us there?" },
    ],
  },
  {
    id: "strategy-growth",
    title: "Growth Strategy",
    description: "Identify and prioritize growth levers for your business",
    category: "strategy",
    icon: "TrendingUp",
    cells: [
      { type: "markdown", content: "# Growth Strategy Framework\n\nAnalyze current growth trajectory, identify high-impact levers, and create an actionable plan to accelerate growth." },
      { type: "ai-prompt", content: "Analyze the current growth state of a [industry] company with [revenue/ARR] and [growth rate]. Identify which stage of growth the company is in (early traction, scaling, optimization) and the typical growth patterns for this stage." },
      { type: "markdown", content: "## Growth Levers\n\nRate each lever on Impact (1-5) and Effort (1-5):\n\n| Lever | Impact | Effort | Priority |\n|-------|--------|--------|----------|\n| New customer acquisition | | | |\n| Expansion revenue (upsell) | | | |\n| Reduce churn | | | |\n| Pricing optimization | | | |\n| New market/segment | | | |\n| New product/feature | | | |\n| Channel partnerships | | | |\n| Viral/referral loops | | | |" },
      { type: "ai-prompt", content: "For a [industry] company at [revenue stage], recommend the top 3 growth levers to prioritize. For each, provide specific tactics, expected impact on growth rate, timeline to results, and resource requirements." },
      { type: "markdown", content: "## 90-Day Action Plan\n\n### Month 1\n- [ ] \n\n### Month 2\n- [ ] \n\n### Month 3\n- [ ] \n\n**Success metric:** [target growth rate] by [date]" },
    ],
  },
  {
    id: "strategy-okr",
    title: "OKR Framework",
    description: "Set and track Objectives and Key Results for the quarter",
    category: "strategy",
    icon: "Target",
    cells: [
      { type: "markdown", content: "# OKR Framework\n\nDefine quarterly Objectives and Key Results. Each objective should be ambitious and qualitative. Each key result should be measurable and time-bound." },
      { type: "ai-prompt", content: "Suggest 3-5 quarterly OKRs for a [role/team] at a [stage] [industry] company. Each objective should have 3-4 measurable key results. Make them ambitious but achievable (70% confidence level)." },
      { type: "markdown", content: "## Objective 1: [Title]\n\n| Key Result | Target | Current | Status |\n|-----------|--------|---------|--------|\n| KR1: | | | |\n| KR2: | | | |\n| KR3: | | | |\n\n## Objective 2: [Title]\n\n| Key Result | Target | Current | Status |\n|-----------|--------|---------|--------|\n| KR1: | | | |\n| KR2: | | | |\n| KR3: | | | |" },
      { type: "code", content: "# OKR progress tracker\nokrs = [\n    {'objective': 'Objective 1', 'krs': [\n        {'name': 'KR1', 'target': 100, 'current': 0},\n        {'name': 'KR2', 'target': 50, 'current': 0},\n        {'name': 'KR3', 'target': 25, 'current': 0},\n    ]},\n]\n\nfor okr in okrs:\n    print(f\"\\n{okr['objective']}\")\n    total_progress = 0\n    for kr in okr['krs']:\n        pct = (kr['current'] / kr['target']) * 100\n        total_progress += pct\n        bar = '#' * int(pct // 5) + '-' * (20 - int(pct // 5))\n        print(f\"  {kr['name']}: [{bar}] {pct:.0f}%\")\n    avg = total_progress / len(okr['krs'])\n    print(f\"  Overall: {avg:.0f}%\")" },
    ],
  },
  {
    id: "strategy-gtm",
    title: "GTM Plan",
    description: "Go-to-market planning with audience, channels, and timeline",
    category: "strategy",
    icon: "Rocket",
    cells: [
      { type: "markdown", content: "# Go-to-Market Plan\n\nComprehensive plan for launching [product/feature] to market. Covers target audience, messaging, channels, timeline, and budget." },
      { type: "ai-prompt", content: "Define the ideal customer profile (ICP) and key buyer personas for [product] in [industry]. Include company demographics (size, vertical, tech stack) and individual buyer attributes (title, pain points, buying triggers, objections)." },
      { type: "markdown", content: "## Messaging Framework\n\n**Positioning statement:** For [target customer] who [need], [product] is a [category] that [key benefit]. Unlike [alternative], we [differentiator].\n\n**Value propositions:**\n1. \n2. \n3. " },
      { type: "ai-prompt", content: "Recommend the top 5 acquisition channels for [product] targeting [ICP]. For each channel, estimate: cost per lead, conversion rate, time to results, and scalability. Rank by expected ROI." },
      { type: "markdown", content: "## Launch Timeline\n\n| Week | Milestone | Owner | Status |\n|------|-----------|-------|--------|\n| W-4 | Messaging finalized | | |\n| W-3 | Sales enablement ready | | |\n| W-2 | Content and assets live | | |\n| W-1 | PR/analyst outreach | | |\n| Launch | Product available | | |\n| W+1 | Post-launch review | | |" },
      { type: "markdown", content: "## Budget Allocation\n\n| Category | Budget | % of Total |\n|----------|--------|------------|\n| Paid media | | |\n| Content | | |\n| Events | | |\n| PR | | |\n| Sales enablement | | |\n| **Total** | | 100% |" },
    ],
  },
  {
    id: "strategy-business-model-canvas",
    title: "Business Model Canvas",
    description: "Map all 9 building blocks of your business model",
    category: "strategy",
    icon: "LayoutGrid",
    cells: [
      { type: "markdown", content: "# Business Model Canvas\n\nA strategic tool for developing new or documenting existing business models. Fill in each of the 9 blocks below." },
      { type: "ai-prompt", content: "Analyze the business model of [company] and fill in the Business Model Canvas. For each of the 9 blocks (Customer Segments, Value Propositions, Channels, Customer Relationships, Revenue Streams, Key Resources, Key Activities, Key Partnerships, Cost Structure), provide 3-5 bullet points." },
      { type: "markdown", content: "## Customer Segments\nWho are you creating value for?\n\n## Value Propositions\nWhat value do you deliver to the customer?\n\n## Channels\nHow do you reach your customer segments?\n\n## Customer Relationships\nWhat type of relationship does each segment expect?\n\n## Revenue Streams\nWhat are customers willing to pay for?" },
      { type: "markdown", content: "## Key Resources\nWhat assets are required to make the model work?\n\n## Key Activities\nWhat activities does the value proposition require?\n\n## Key Partnerships\nWho are your key partners and suppliers?\n\n## Cost Structure\nWhat are the most important costs inherent in the model?" },
    ],
  },
  {
    id: "strategy-value-chain",
    title: "Value Chain Analysis",
    description: "Map primary and support activities to find competitive advantage",
    category: "strategy",
    icon: "Link",
    cells: [
      { type: "markdown", content: "# Value Chain Analysis\n\nIdentify the activities that create value and cost in [company/product]. Find sources of competitive advantage by examining each link in the chain." },
      { type: "ai-prompt", content: "Analyze the primary value chain activities for a [industry] company: Inbound Logistics, Operations, Outbound Logistics, Marketing & Sales, and Service. For each, describe the key activities, cost drivers, and differentiation opportunities." },
      { type: "ai-prompt", content: "Analyze the support value chain activities for a [industry] company: Firm Infrastructure, HR Management, Technology Development, and Procurement. For each, describe how they enable or constrain the primary activities." },
      { type: "markdown", content: "## Margin Analysis\n\n| Activity | Cost % | Value Contribution | Competitive Advantage? |\n|----------|--------|-------------------|----------------------|\n| Inbound Logistics | | | |\n| Operations | | | |\n| Outbound Logistics | | | |\n| Marketing & Sales | | | |\n| Service | | | |\n\n**Key insight:** Where does the most value get created vs. destroyed?" },
    ],
  },

  // ---------------------------------------------------------------------------
  // INTELLIGENCE (10)
  // ---------------------------------------------------------------------------
  {
    id: "intelligence-weekly-brief",
    title: "Weekly Intelligence Brief",
    description: "Automated weekly summary of competitive and market signals",
    category: "intelligence",
    icon: "CalendarDays",
    cells: [
      { type: "markdown", content: "# Weekly Intelligence Brief\n\n**Week of:** [date]\n**Prepared for:** [team/executive]\n\nThis brief synthesizes the most important competitive, market, and industry signals from the past 7 days." },
      { type: "ai-prompt", content: "Summarize the top 5 competitive developments in [industry] from the past week. Include product launches, funding rounds, partnerships, leadership changes, and pricing moves. For each, rate the impact on [company] as Low/Medium/High." },
      { type: "ai-prompt", content: "Identify the top 3 market trends or macro signals from the past week that affect [industry]. Consider economic indicators, regulatory changes, technology shifts, and consumer behavior changes." },
      { type: "markdown", content: "## Action Items\n\n| Signal | Recommended Action | Owner | Priority |\n|--------|-------------------|-------|----------|\n| | | | |\n| | | | |\n| | | | |\n\n## Next Week Watch List\n- \n- \n- " },
    ],
  },
  {
    id: "intelligence-daily-digest",
    title: "Daily Digest",
    description: "Quick daily scan of overnight changes and priority signals",
    category: "intelligence",
    icon: "Sunrise",
    cells: [
      { type: "markdown", content: "# Daily Intelligence Digest\n\n**Date:** [date]\n\nQuick-scan of overnight developments requiring attention." },
      { type: "ai-prompt", content: "What are the most important overnight developments affecting [industry] as of [date]? Check for: earnings reports, product announcements, regulatory news, M&A activity, and executive moves. Prioritize by urgency." },
      { type: "markdown", content: "## Priority Signals\n\n**Immediate attention:**\n- \n\n**Monitor today:**\n- \n\n**Background awareness:**\n- " },
    ],
  },
  {
    id: "intelligence-competitor-deep-dive",
    title: "Competitor Deep Dive",
    description: "Comprehensive single-competitor intelligence report",
    category: "intelligence",
    icon: "Eye",
    cells: [
      { type: "markdown", content: "# Competitor Deep Dive: [Competitor Name]\n\nComprehensive intelligence dossier on a single competitor. Updated [date]." },
      { type: "ai-prompt", content: "Provide a company overview of [competitor]: founding year, headquarters, employee count, funding/revenue, key executives, mission statement, and recent major milestones." },
      { type: "ai-prompt", content: "Analyze [competitor]'s product portfolio. For each major product: target customer, key features, pricing model, strengths, and weaknesses relative to [your company]." },
      { type: "ai-prompt", content: "Analyze [competitor]'s go-to-market strategy. Cover: sales motion (PLG vs. sales-led), marketing channels, content strategy, partnership ecosystem, and geographic focus." },
      { type: "markdown", content: "## Strategic Assessment\n\n**Where they are winning:** \n\n**Where they are vulnerable:** \n\n**Likely next moves:** \n\n**Our recommended response:** " },
    ],
  },
  {
    id: "intelligence-industry-trends",
    title: "Industry Trends Report",
    description: "Macro trends, emerging tech, and regulatory landscape analysis",
    category: "intelligence",
    icon: "TrendingUp",
    cells: [
      { type: "markdown", content: "# Industry Trends Report: [Industry]\n\n**Period:** [Quarter/Year]\n\nAnalysis of macro-level trends shaping the industry over the next 12-24 months." },
      { type: "ai-prompt", content: "Identify the top 5 macro trends affecting [industry] over the next 12-24 months. For each trend, describe: the driving forces, current evidence, expected impact, and timeline. Include both technology trends and market/regulatory trends." },
      { type: "ai-prompt", content: "What emerging technologies are most likely to disrupt [industry] in the next 2-5 years? For each, assess: maturity level (nascent/emerging/mainstream), adoption barriers, and potential impact on [company]'s business model." },
      { type: "ai-prompt", content: "Summarize the current and upcoming regulatory landscape affecting [industry]. Include pending legislation, enforcement trends, and compliance requirements. Highlight any that pose existential risk or create opportunity." },
      { type: "markdown", content: "## Implications for [Company]\n\n| Trend | Impact (1-5) | Urgency | Our Readiness | Action Needed |\n|-------|-------------|---------|--------------|---------------|\n| | | | | |\n| | | | | |" },
    ],
  },
  {
    id: "intelligence-social-listening",
    title: "Social Listening Summary",
    description: "Brand mentions, sentiment analysis, and key conversation themes",
    category: "intelligence",
    icon: "MessageCircle",
    cells: [
      { type: "markdown", content: "# Social Listening Summary\n\n**Period:** [dates]\n**Platforms:** Twitter/X, LinkedIn, Reddit, G2, Hacker News\n\nAggregate view of brand and competitor mentions across social channels." },
      { type: "ai-prompt", content: "Analyze social media mentions of [brand] over the past [timeframe]. Categorize by: sentiment (positive/neutral/negative), platform, topic theme, and volume trend. Highlight any viral posts or emerging narratives." },
      { type: "ai-prompt", content: "Compare social sentiment for [brand] vs. [competitor 1] and [competitor 2] over the past [timeframe]. Identify topics where each brand is perceived positively or negatively. Note any share-of-voice shifts." },
      { type: "markdown", content: "## Key Themes\n\n| Theme | Sentiment | Volume | Trend | Action |\n|-------|-----------|--------|-------|--------|\n| | | | | |\n\n## Notable Posts / Threads\n\n1. \n2. \n3. " },
    ],
  },
  {
    id: "intelligence-pr-media",
    title: "PR & Media Monitor",
    description: "Press coverage tracking, message analysis, and media strategy",
    category: "intelligence",
    icon: "Newspaper",
    cells: [
      { type: "markdown", content: "# PR & Media Monitor\n\n**Period:** [dates]\n\nTrack press coverage, analyze message penetration, and inform media strategy." },
      { type: "ai-prompt", content: "Summarize recent press coverage of [company] and key competitors in [industry]. Include: publication, headline, tone, key messages, and estimated reach. Highlight any coverage that deviates from desired narrative." },
      { type: "markdown", content: "## Message Penetration\n\n| Key Message | Appeared In | Frequency | Accuracy |\n|------------|------------|-----------|----------|\n| | | | |\n\n## Media Strategy Recommendations\n\n- **Pitch angles for next month:**\n- **Publications to target:**\n- **Reactive statement needed:**" },
    ],
  },
  {
    id: "intelligence-seo-audit",
    title: "SEO Competitive Audit",
    description: "Keyword gaps, content opportunities, and technical SEO issues",
    category: "intelligence",
    icon: "Search",
    cells: [
      { type: "markdown", content: "# SEO Competitive Audit\n\n**Domain:** [your-domain.com]\n**Competitors:** [competitor domains]\n\nIdentify keyword gaps, content opportunities, and technical improvements." },
      { type: "ai-prompt", content: "Identify the top 20 high-value keywords that [competitor domain] ranks for but [your domain] does not. For each keyword, provide: search volume, difficulty, current top-ranking page, and content type needed to compete." },
      { type: "ai-prompt", content: "Suggest 10 content pieces that would close the biggest SEO gaps between [your domain] and [competitor domain]. For each, specify: target keyword cluster, content format (blog, guide, tool), estimated traffic potential, and production effort." },
      { type: "markdown", content: "## Technical SEO Issues\n\n| Issue | Pages Affected | Priority | Fix |\n|-------|---------------|----------|-----|\n| | | | |\n\n## Quick Wins (next 30 days)\n1. \n2. \n3. " },
    ],
  },
  {
    id: "intelligence-share-of-voice",
    title: "Share of Voice",
    description: "Media, social, and search share analysis across competitors",
    category: "intelligence",
    icon: "PieChart",
    cells: [
      { type: "markdown", content: "# Share of Voice Report\n\n**Period:** [dates]\n\nMeasure brand visibility relative to competitors across media, social, and search." },
      { type: "ai-prompt", content: "Estimate the share of voice for [company] vs. [competitor 1], [competitor 2], [competitor 3] across: earned media mentions, social media engagement, and organic search visibility. Provide percentages and trend direction (up/down/flat)." },
      { type: "code", content: "# Share of voice visualization\nimport matplotlib.pyplot as plt\n\ncompanies = ['Your Company', 'Competitor A', 'Competitor B', 'Competitor C', 'Others']\nmedia_share = [22, 28, 20, 15, 15]\nsocial_share = [30, 25, 18, 17, 10]\nsearch_share = [18, 32, 22, 16, 12]\n\nfig, axes = plt.subplots(1, 3, figsize=(15, 5))\nfor ax, data, title in zip(axes, [media_share, social_share, search_share], ['Media', 'Social', 'Search']):\n    ax.pie(data, labels=companies, autopct='%1.0f%%', startangle=90)\n    ax.set_title(f'{title} Share of Voice')\nplt.tight_layout()\nplt.show()" },
      { type: "markdown", content: "## Trend Analysis\n\n| Company | Last Period | This Period | Change |\n|---------|-----------|------------|--------|\n| | | | |\n\n**Key drivers of change:**" },
    ],
  },
  {
    id: "intelligence-brand-health",
    title: "Brand Health Dashboard",
    description: "NPS trends, sentiment tracking, and brand awareness metrics",
    category: "intelligence",
    icon: "Heart",
    cells: [
      { type: "markdown", content: "# Brand Health Dashboard\n\n**Period:** [dates]\n\nHolistic view of brand strength across awareness, perception, and loyalty metrics." },
      { type: "ai-prompt", content: "Outline the key brand health metrics for a [industry] company. Include: aided/unaided awareness, Net Promoter Score, brand sentiment, consideration rate, and brand associations. Suggest benchmarks for each." },
      { type: "code", content: "# NPS trend tracker\nimport matplotlib.pyplot as plt\n\nmonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']\nnps_scores = [32, 35, 33, 38, 41, 44]\npromoters = [48, 50, 49, 52, 55, 57]\ndetractors = [16, 15, 16, 14, 14, 13]\n\nfig, ax1 = plt.subplots(figsize=(10, 5))\nax1.plot(months, nps_scores, 'o-', color='#4F46E5', linewidth=2, label='NPS')\nax1.fill_between(months, nps_scores, alpha=0.1, color='#4F46E5')\nax1.set_ylabel('NPS Score')\nax1.set_ylim(0, 70)\nax1.legend(loc='upper left')\nax1.set_title('NPS Trend')\nplt.tight_layout()\nplt.show()" },
      { type: "markdown", content: "## Brand Perception\n\n| Attribute | Target | Actual | Gap |\n|-----------|--------|--------|-----|\n| Innovative | | | |\n| Trustworthy | | | |\n| Easy to use | | | |\n| Good value | | | |\n\n**Actions to close gaps:**" },
    ],
  },
  {
    id: "intelligence-pricing",
    title: "Pricing Intelligence",
    description: "Competitor pricing analysis with value mapping and recommendations",
    category: "intelligence",
    icon: "DollarSign",
    cells: [
      { type: "markdown", content: "# Pricing Intelligence Report\n\n**Industry:** [industry]\n**Date:** [date]\n\nComprehensive analysis of competitor pricing strategies and recommendations for positioning." },
      { type: "ai-prompt", content: "Analyze the pricing strategies of the top 5 competitors in [industry]. For each, detail: pricing model (per-seat, usage, flat), tier structure, entry price, enterprise price, and any recent pricing changes. Include free/trial offerings." },
      { type: "markdown", content: "## Pricing Comparison Matrix\n\n| Feature/Tier | Your Co. | Comp A | Comp B | Comp C |\n|-------------|----------|--------|--------|--------|\n| Entry price | | | | |\n| Mid-tier | | | | |\n| Enterprise | | | | |\n| Free tier | | | | |\n| Pricing model | | | | |" },
      { type: "ai-prompt", content: "Based on the competitive pricing landscape in [industry], recommend a pricing strategy for [company]. Consider: value metric alignment, willingness to pay, competitive positioning, and expansion revenue potential. Provide specific price points with rationale." },
    ],
  },

  // ---------------------------------------------------------------------------
  // MARKETING (10)
  // ---------------------------------------------------------------------------
  {
    id: "marketing-campaign-review",
    title: "Campaign Performance Review",
    description: "KPI summary, channel breakdown, and optimization recommendations",
    category: "marketing",
    icon: "Megaphone",
    cells: [
      { type: "markdown", content: "# Campaign Performance Review\n\n**Campaign:** [name]\n**Period:** [dates]\n**Budget:** $[amount]\n\nPost-campaign analysis with KPI results, channel performance, and recommendations for next iteration." },
      { type: "ai-prompt", content: "Provide a framework for evaluating a [campaign type] campaign performance. Include the top 10 KPIs to track, benchmark ranges for [industry], and how to calculate ROAS, CAC, and contribution to pipeline." },
      { type: "markdown", content: "## KPI Summary\n\n| Metric | Target | Actual | % of Goal |\n|--------|--------|--------|----------|\n| Impressions | | | |\n| Clicks / CTR | | | |\n| Conversions | | | |\n| Cost per Lead | | | |\n| ROAS | | | |\n| Pipeline Generated | | | |" },
      { type: "markdown", content: "## Channel Breakdown\n\n| Channel | Spend | Leads | CPL | Conv Rate |\n|---------|-------|-------|-----|----------|\n| Paid Search | | | | |\n| Paid Social | | | | |\n| Email | | | | |\n| Content/SEO | | | | |\n| Events | | | | |" },
      { type: "markdown", content: "## Recommendations\n\n**Scale:** Channels/tactics that exceeded targets\n\n**Optimize:** Channels/tactics with potential but underperforming\n\n**Cut:** Channels/tactics to eliminate or reduce" },
    ],
  },
  {
    id: "marketing-attribution",
    title: "Channel Attribution",
    description: "Multi-touch attribution analysis and budget reallocation",
    category: "marketing",
    icon: "GitBranch",
    cells: [
      { type: "markdown", content: "# Channel Attribution Analysis\n\n**Period:** [dates]\n\nUnderstand which channels and touchpoints drive conversions using multi-touch attribution modeling." },
      { type: "ai-prompt", content: "Explain the differences between first-touch, last-touch, linear, time-decay, and data-driven attribution models. For a [business type] company, recommend the most appropriate model and explain why." },
      { type: "code", content: "# Multi-touch attribution calculation\nimport pandas as pd\n\n# Example touchpoint data\ntouchpoints = pd.DataFrame({\n    'Channel': ['Paid Search', 'LinkedIn', 'Email', 'Webinar', 'Direct'],\n    'First_Touch_Pct': [35, 25, 10, 20, 10],\n    'Last_Touch_Pct': [20, 10, 30, 15, 25],\n    'Linear_Pct': [22, 18, 25, 20, 15],\n    'Spend': [50000, 30000, 5000, 15000, 0],\n})\n\ntouchpoints['Linear_Revenue'] = touchpoints['Linear_Pct'] / 100 * 500000\ntouchpoints['ROAS'] = touchpoints['Linear_Revenue'] / touchpoints['Spend'].replace(0, float('inf'))\n\nprint(touchpoints.to_markdown(index=False))" },
      { type: "markdown", content: "## Budget Reallocation Recommendation\n\n| Channel | Current Budget | Recommended | Change | Rationale |\n|---------|---------------|------------|--------|----------|\n| | | | | |\n\n**Expected impact of reallocation:** [X]% improvement in blended CAC" },
    ],
  },
  {
    id: "marketing-content-calendar",
    title: "Content Calendar",
    description: "Themed content planning with calendar grid and distribution",
    category: "marketing",
    icon: "CalendarDays",
    cells: [
      { type: "markdown", content: "# Content Calendar\n\n**Quarter:** [Q_ 20__]\n**Content pillars:** [pillar 1], [pillar 2], [pillar 3]\n\nPlan, schedule, and track content production across all channels." },
      { type: "ai-prompt", content: "Suggest a quarterly content calendar for a [industry] company targeting [audience]. Include: 4 content pillars, 12 blog posts (1/week), 4 long-form pieces, 2 webinars, and 48 social posts. For each item, provide a title, format, target keyword, and distribution channel." },
      { type: "code", content: "# Content calendar grid\nimport pandas as pd\n\ncalendar = pd.DataFrame({\n    'Week': [f'W{i}' for i in range(1, 13)],\n    'Blog_Post': [''] * 12,\n    'Social_Theme': [''] * 12,\n    'Long_Form': ['', '', '', 'Whitepaper', '', '', 'Case Study', '', '', 'Report', '', 'Guide'],\n    'Email': ['Newsletter'] * 12,\n    'Status': ['Planned'] * 12,\n})\n\nprint(calendar.to_markdown(index=False))" },
      { type: "markdown", content: "## Distribution Plan\n\n| Content Type | Primary Channel | Amplification | Repurpose Into |\n|-------------|----------------|--------------|----------------|\n| Blog post | Website/SEO | LinkedIn, Twitter | Social snippets, email |\n| Whitepaper | Gated landing page | Paid, email | Blog series, webinar |\n| Webinar | Live event | Email, paid | Blog recap, video clips |\n| Case study | Sales enablement | Website, email | Social proof ads |" },
    ],
  },
  {
    id: "marketing-creative-analysis",
    title: "Ad Creative Analysis",
    description: "Creative performance comparison, A/B results, and iterations",
    category: "marketing",
    icon: "Palette",
    cells: [
      { type: "markdown", content: "# Ad Creative Analysis\n\n**Campaign:** [name]\n**Platform:** [platform]\n**Period:** [dates]\n\nAnalyze creative performance to inform next round of iterations." },
      { type: "ai-prompt", content: "What are the best practices for analyzing ad creative performance on [platform]? Include: key metrics to compare (CTR, conversion rate, cost per result, engagement rate), sample sizes needed for significance, and common creative testing frameworks." },
      { type: "markdown", content: "## Creative Performance\n\n| Creative | Impressions | CTR | Conv Rate | CPA | ROAS |\n|---------|------------|-----|-----------|-----|------|\n| Creative A | | | | | |\n| Creative B | | | | | |\n| Creative C | | | | | |\n\n## A/B Test Results\n\n**Hypothesis:** \n**Winner:** \n**Confidence level:** \n**Key learning:** " },
      { type: "markdown", content: "## Next Iteration Plan\n\n| Element to Test | Variant A | Variant B | Expected Impact |\n|----------------|-----------|-----------|----------------|\n| Headline | | | |\n| Visual | | | |\n| CTA | | | |\n| Audience | | | |" },
    ],
  },
  {
    id: "marketing-funnel",
    title: "Funnel Analysis",
    description: "Conversion funnel mapping with drop-off analysis and optimization",
    category: "marketing",
    icon: "Filter",
    cells: [
      { type: "markdown", content: "# Funnel Analysis\n\n**Funnel:** [acquisition / activation / monetization]\n**Period:** [dates]\n\nMap conversion rates at each stage, identify bottlenecks, and plan optimizations." },
      { type: "ai-prompt", content: "For a [B2B SaaS / e-commerce / marketplace] company, define the typical conversion funnel stages from first touch to revenue. For each stage, provide: definition, typical conversion rate benchmark, and key metrics to track." },
      { type: "code", content: "# Funnel visualization\nstages = ['Visitors', 'Signups', 'Activated', 'Paid', 'Retained (M3)']\ncounts = [100000, 5000, 2000, 400, 280]\n\nfor i, (stage, count) in enumerate(zip(stages, counts)):\n    conv = f' ({count/counts[i-1]*100:.1f}% conv)' if i > 0 else ''\n    bar = '#' * int(count / max(counts) * 40)\n    print(f'{stage:20s} {count:>8,}{conv}')\n    print(f'  {bar}')\n    if i < len(stages) - 1:\n        drop = counts[i] - counts[i+1]\n        print(f'  --> Drop-off: {drop:,} ({drop/counts[i]*100:.1f}%)')" },
      { type: "markdown", content: "## Optimization Plan\n\n| Stage | Current Rate | Target | Tactics |\n|-------|-------------|--------|--------|\n| Visit -> Signup | | | |\n| Signup -> Activated | | | |\n| Activated -> Paid | | | |\n| Paid -> Retained | | | |\n\n**Highest-leverage fix:** [stage with biggest absolute drop-off]" },
    ],
  },
  {
    id: "marketing-audience-segmentation",
    title: "Audience Segmentation",
    description: "Segment analysis, persona profiles, and targeting strategy",
    category: "marketing",
    icon: "Users",
    cells: [
      { type: "markdown", content: "# Audience Segmentation\n\nDefine and analyze customer segments to improve targeting, messaging, and product-market fit." },
      { type: "ai-prompt", content: "Suggest 4-6 customer segments for a [product] in [industry]. For each segment, provide: segment name, size estimate, defining characteristics (firmographic + behavioral), primary pain point, willingness to pay, and acquisition channel." },
      { type: "markdown", content: "## Segment Profiles\n\n### Segment 1: [Name]\n- **Size:** \n- **Characteristics:** \n- **Pain point:** \n- **Messaging angle:** \n- **Best channel:** \n- **LTV potential:** \n\n### Segment 2: [Name]\n- **Size:** \n- **Characteristics:** \n- **Pain point:** \n- **Messaging angle:** \n- **Best channel:** \n- **LTV potential:** " },
      { type: "ai-prompt", content: "Create a targeting prioritization matrix for [company]'s customer segments. Rank segments by: market size, willingness to pay, ease of acquisition, strategic fit, and expansion potential. Recommend which 1-2 segments to focus on and why." },
    ],
  },
  {
    id: "marketing-email-performance",
    title: "Email Performance",
    description: "Campaign metrics, subject line analysis, and send optimization",
    category: "marketing",
    icon: "Mail",
    cells: [
      { type: "markdown", content: "# Email Performance Analysis\n\n**Period:** [dates]\n**List size:** [count]\n\nAnalyze email campaign effectiveness and identify optimization opportunities." },
      { type: "ai-prompt", content: "Provide benchmarks for email marketing metrics in [industry]: open rate, click rate, click-to-open rate, unsubscribe rate, bounce rate, and conversion rate. Break down by email type (newsletter, promotional, transactional, nurture)." },
      { type: "markdown", content: "## Campaign Results\n\n| Campaign | Sent | Open Rate | Click Rate | CTOR | Unsub Rate | Conversions |\n|---------|------|-----------|-----------|------|-----------|-------------|\n| | | | | | | |\n\n## Subject Line Analysis\n\n| Subject Line | Open Rate | vs. Avg | Key Element |\n|-------------|-----------|---------|-------------|\n| | | | |\n\n## Recommendations\n\n- **Subject lines:** \n- **Send time:** \n- **Segmentation:** \n- **Content:** " },
    ],
  },
  {
    id: "marketing-budget-allocator",
    title: "Budget Allocator",
    description: "Data-driven marketing budget allocation across channels",
    category: "marketing",
    icon: "Calculator",
    cells: [
      { type: "markdown", content: "# Marketing Budget Allocator\n\n**Total Budget:** $[amount]\n**Period:** [quarter/year]\n\nAllocate budget across channels based on historical performance and strategic priorities." },
      { type: "ai-prompt", content: "For a [stage] [industry] company with a $[X] quarterly marketing budget, suggest an optimal channel allocation. Consider: paid search, paid social, content/SEO, email, events, partnerships, and brand. Provide percentage allocation and expected CAC by channel." },
      { type: "code", content: "# Budget allocation optimizer\nimport pandas as pd\n\ntotal_budget = 250000\n\nchannels = pd.DataFrame({\n    'Channel': ['Paid Search', 'Paid Social', 'Content/SEO', 'Email', 'Events', 'Partnerships'],\n    'Current_Pct': [30, 25, 15, 10, 15, 5],\n    'Hist_CAC': [180, 220, 95, 45, 350, 120],\n    'Hist_Conv_Rate': [3.2, 1.8, 2.5, 4.1, 1.2, 2.8],\n})\n\nchannels['Current_Budget'] = total_budget * channels['Current_Pct'] / 100\nchannels['Expected_Leads'] = channels['Current_Budget'] / channels['Hist_CAC']\n\nprint(channels.to_markdown(index=False))\nprint(f\"\\nTotal expected leads: {channels['Expected_Leads'].sum():.0f}\")\nprint(f\"Blended CAC: ${total_budget / channels['Expected_Leads'].sum():.0f}\")" },
      { type: "markdown", content: "## Recommended Reallocation\n\n| Channel | Current % | Recommended % | Change | Rationale |\n|---------|-----------|--------------|--------|----------|\n| | | | | |\n\n**Expected impact:** [X]% more leads at [Y]% lower blended CAC" },
    ],
  },
  {
    id: "marketing-roi-calculator",
    title: "ROI Calculator",
    description: "Investment return modeling with break-even analysis",
    category: "marketing",
    icon: "Calculator",
    cells: [
      { type: "markdown", content: "# Marketing ROI Calculator\n\nModel the return on a marketing investment with scenario analysis and break-even projections." },
      { type: "code", content: "# ROI Calculator\ninvestment = 100000  # Total marketing investment\ncpl = 150  # Cost per lead\nlead_to_opp = 0.20  # Lead to opportunity rate\nopp_to_close = 0.25  # Opportunity to close rate\navg_deal_size = 30000  # Average deal value\n\nleads = investment / cpl\nopportunities = leads * lead_to_opp\nclosed_deals = opportunities * opp_to_close\nrevenue = closed_deals * avg_deal_size\nroi = (revenue - investment) / investment * 100\n\nprint(f'Investment: ${investment:,.0f}')\nprint(f'Leads generated: {leads:.0f}')\nprint(f'Opportunities: {opportunities:.0f}')\nprint(f'Closed deals: {closed_deals:.0f}')\nprint(f'Revenue: ${revenue:,.0f}')\nprint(f'ROI: {roi:.0f}%')\nprint(f'\\nBreak-even requires {investment / avg_deal_size:.1f} deals')\nprint(f'Break-even CPL: ${avg_deal_size * lead_to_opp * opp_to_close:.0f}')" },
      { type: "markdown", content: "## Scenario Analysis\n\n| Scenario | CPL | Conv Rate | Revenue | ROI |\n|---------|-----|-----------|---------|-----|\n| Conservative | | | | |\n| Base case | | | | |\n| Optimistic | | | | |\n\n## Assumptions & Risks\n\n- \n- " },
    ],
  },
  {
    id: "marketing-campaign-planning",
    title: "Campaign Planning",
    description: "End-to-end campaign plan from objectives to creative brief",
    category: "marketing",
    icon: "ClipboardList",
    cells: [
      { type: "markdown", content: "# Campaign Planning Brief\n\n**Campaign name:** [name]\n**Launch date:** [date]\n**Campaign owner:** [name]" },
      { type: "markdown", content: "## Objectives\n\n**Business objective:** \n**Marketing objective:** \n**KPIs:**\n- Primary: \n- Secondary: \n\n**Budget:** $[amount]" },
      { type: "ai-prompt", content: "For a [campaign type] campaign targeting [audience] in [industry], recommend: target audience segments, key messages per segment, channel mix, content assets needed, and a week-by-week timeline for a [X]-week campaign." },
      { type: "markdown", content: "## Creative Brief\n\n**Key message:** \n**Tone:** \n**Visual direction:** \n**Call to action:** \n**Mandatory inclusions:** \n\n## Asset Checklist\n\n- [ ] Landing page\n- [ ] Email sequences (x[count])\n- [ ] Ad creatives (x[count])\n- [ ] Social posts (x[count])\n- [ ] Blog post\n- [ ] Sales enablement" },
      { type: "markdown", content: "## Timeline\n\n| Week | Activity | Owner | Status |\n|------|----------|-------|--------|\n| W-3 | Brief approved | | |\n| W-2 | Assets in production | | |\n| W-1 | QA and staging | | |\n| Launch | Go live | | |\n| W+1 | Optimization pass | | |\n| W+2 | Mid-campaign review | | |" },
    ],
  },

  // ---------------------------------------------------------------------------
  // FINANCE (8)
  // ---------------------------------------------------------------------------
  {
    id: "finance-revenue-forecast",
    title: "Revenue Forecast",
    description: "Historical trend analysis with growth assumptions and projections",
    category: "finance",
    icon: "TrendingUp",
    cells: [
      { type: "markdown", content: "# Revenue Forecast\n\n**Period:** [next 4 quarters / next 12 months]\n**Base period:** [last 12 months]\n\nProject future revenue using historical trends, growth assumptions, and scenario modeling." },
      { type: "ai-prompt", content: "Provide a revenue forecasting framework for a [stage] [industry] SaaS company. Cover: key inputs (current MRR, growth rate, churn, expansion), forecasting methodologies (bottoms-up vs. top-down), and common pitfalls in SaaS revenue forecasting." },
      { type: "code", content: "# Revenue projection model\nimport pandas as pd\n\ncurrent_mrr = 150000\nmonthly_growth_rate = 0.08\nmonthly_churn_rate = 0.03\nexpansion_rate = 0.02\nnew_mrr_monthly = 25000\n\nmonths = []\nmrr = current_mrr\n\nfor m in range(1, 13):\n    churned = mrr * monthly_churn_rate\n    expanded = mrr * expansion_rate\n    mrr = mrr - churned + expanded + new_mrr_monthly\n    months.append({\n        'Month': m,\n        'MRR': round(mrr),\n        'ARR': round(mrr * 12),\n        'New': new_mrr_monthly,\n        'Churned': round(churned),\n        'Expanded': round(expanded)\n    })\n\ndf = pd.DataFrame(months)\nprint(df.to_markdown(index=False))\nprint(f\"\\nProjected ARR in 12 months: ${df.iloc[-1]['ARR']:,.0f}\")" },
      { type: "markdown", content: "## Key Assumptions\n\n| Assumption | Value | Source/Rationale |\n|-----------|-------|------------------|\n| Monthly growth rate | | |\n| Churn rate | | |\n| Expansion rate | | |\n| New MRR/month | | |\n\n## Risks to Forecast\n\n- Upside: \n- Downside: " },
    ],
  },
  {
    id: "finance-unit-economics",
    title: "Unit Economics",
    description: "CAC, LTV, and payback period analysis for your business",
    category: "finance",
    icon: "Coins",
    cells: [
      { type: "markdown", content: "# Unit Economics\n\nUnderstand the fundamental profitability of each customer acquired. Healthy unit economics are the foundation of sustainable growth." },
      { type: "ai-prompt", content: "Explain the key unit economics metrics for a [business model] company: Customer Acquisition Cost (CAC), Lifetime Value (LTV), LTV:CAC ratio, payback period, and gross margin. Provide benchmark ranges for [industry] at each funding stage." },
      { type: "code", content: "# Unit economics calculator\n# -- Inputs --\nmonthly_marketing_spend = 80000\nmonthly_sales_spend = 120000\nnew_customers_per_month = 40\navg_monthly_revenue = 2500\ngross_margin = 0.78\nmonthly_churn = 0.025\n\n# -- Calculations --\ncac = (monthly_marketing_spend + monthly_sales_spend) / new_customers_per_month\navg_lifetime_months = 1 / monthly_churn\nltv = avg_monthly_revenue * gross_margin * avg_lifetime_months\nltv_cac_ratio = ltv / cac\npayback_months = cac / (avg_monthly_revenue * gross_margin)\n\nprint(f'CAC: ${cac:,.0f}')\nprint(f'LTV: ${ltv:,.0f}')\nprint(f'LTV:CAC Ratio: {ltv_cac_ratio:.1f}x')\nprint(f'Payback Period: {payback_months:.1f} months')\nprint(f'Avg Customer Lifetime: {avg_lifetime_months:.0f} months')\nprint(f'\\nHealth Check:')\nprint(f'  LTV:CAC > 3x: {\"PASS\" if ltv_cac_ratio > 3 else \"FAIL\"}')\nprint(f'  Payback < 12mo: {\"PASS\" if payback_months < 12 else \"FAIL\"}')" },
      { type: "markdown", content: "## Improvement Levers\n\n| Lever | Current | Target | Impact on LTV:CAC |\n|-------|---------|--------|-------------------|\n| Reduce CAC | | | |\n| Increase ARPU | | | |\n| Reduce churn | | | |\n| Improve gross margin | | | |" },
    ],
  },
  {
    id: "finance-cohort-revenue",
    title: "Cohort Revenue Analysis",
    description: "Revenue retention curves and cohort-level performance",
    category: "finance",
    icon: "BarChart3",
    cells: [
      { type: "markdown", content: "# Cohort Revenue Analysis\n\nTrack how revenue evolves for each customer cohort over time. Identify whether newer cohorts perform better or worse than older ones." },
      { type: "ai-prompt", content: "Explain cohort revenue analysis for a SaaS business. Cover: how to define cohorts (by signup month), what metrics to track (gross revenue retention, net revenue retention, expansion), and how to interpret cohort curves. Provide examples of healthy vs. concerning patterns." },
      { type: "code", content: "# Cohort retention matrix\nimport pandas as pd\nimport numpy as np\n\n# Simulated cohort data (net revenue retention %)\ncohorts = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']\nmonths = [f'M{i}' for i in range(7)]\n\ndata = []\nfor i, cohort in enumerate(cohorts):\n    row = [100]  # M0 is always 100%\n    for m in range(1, 7):\n        retention = row[-1] * np.random.uniform(0.95, 1.05)  # ~100% NRR\n        row.append(round(retention, 1))\n    data.append(row[:7-i] + [None]*i)  # Future months are None\n\ndf = pd.DataFrame(data, index=cohorts, columns=months[:7])\nprint('Net Revenue Retention by Cohort (%)')\nprint(df.to_markdown())" },
      { type: "markdown", content: "## Key Findings\n\n- **Gross retention:** [X]% average across cohorts\n- **Net retention:** [X]% average (above/below 100%)\n- **Expansion trend:** Increasing / Decreasing / Flat\n- **Best cohort:** [month] -- why?\n- **Worst cohort:** [month] -- why?" },
    ],
  },
  {
    id: "finance-mrr-arr",
    title: "MRR / ARR Tracker",
    description: "Monthly and annual recurring revenue with growth and churn",
    category: "finance",
    icon: "BarChart3",
    cells: [
      { type: "markdown", content: "# MRR / ARR Tracker\n\n**Current MRR:** $[amount]\n**Current ARR:** $[amount]\n\nTrack the components of recurring revenue growth: new, expansion, contraction, and churn." },
      { type: "ai-prompt", content: "Provide a framework for MRR/ARR tracking for a SaaS company. Define: New MRR, Expansion MRR, Contraction MRR, Churned MRR, Reactivation MRR, and Net New MRR. What are healthy benchmarks for each component at [revenue stage]?" },
      { type: "code", content: "# MRR waterfall\nmonths_data = [\n    {'Month': 'Jan', 'Start_MRR': 100000, 'New': 15000, 'Expansion': 8000, 'Contraction': -2000, 'Churn': -4000},\n    {'Month': 'Feb', 'Start_MRR': 117000, 'New': 18000, 'Expansion': 9000, 'Contraction': -2500, 'Churn': -3500},\n    {'Month': 'Mar', 'Start_MRR': 138000, 'New': 20000, 'Expansion': 10000, 'Contraction': -3000, 'Churn': -4000},\n]\n\nfor m in months_data:\n    net_new = m['New'] + m['Expansion'] + m['Contraction'] + m['Churn']\n    end_mrr = m['Start_MRR'] + net_new\n    growth = net_new / m['Start_MRR'] * 100\n    print(f\"{m['Month']}:\")\n    print(f\"  Start MRR:    ${m['Start_MRR']:>10,.0f}\")\n    print(f\"  + New:        ${m['New']:>10,.0f}\")\n    print(f\"  + Expansion:  ${m['Expansion']:>10,.0f}\")\n    print(f\"  - Contraction:${m['Contraction']:>10,.0f}\")\n    print(f\"  - Churn:      ${m['Churn']:>10,.0f}\")\n    print(f\"  = End MRR:    ${end_mrr:>10,.0f} ({growth:+.1f}%)\")\n    print()" },
      { type: "markdown", content: "## Growth Analysis\n\n| Metric | This Month | Last Month | Trend |\n|--------|-----------|-----------|-------|\n| Net New MRR | | | |\n| MoM Growth | | | |\n| Logo Churn Rate | | | |\n| Revenue Churn Rate | | | |\n| Net Revenue Retention | | | |" },
    ],
  },
  {
    id: "finance-burn-rate",
    title: "Burn Rate Analysis",
    description: "Monthly burn, runway calculation, and scenario planning",
    category: "finance",
    icon: "Flame",
    cells: [
      { type: "markdown", content: "# Burn Rate Analysis\n\n**Cash on hand:** $[amount]\n**Date of last funding:** [date]\n\nCalculate runway under different scenarios and identify levers to extend it." },
      { type: "ai-prompt", content: "Provide a burn rate analysis framework for a [stage] startup. Cover: gross burn vs. net burn, fixed vs. variable costs, runway calculation methods, and what runway targets are appropriate for each stage. What are the warning signs that a company needs to act on burn?" },
      { type: "code", content: "# Runway calculator with scenarios\ncash_on_hand = 3000000\nmonthly_revenue = 120000\nmonthly_expenses = 280000\nrevenue_growth_rate = 0.06  # MoM\n\nscenarios = {\n    'Base case': {'rev_growth': 0.06, 'expense_growth': 0.02},\n    'Aggressive growth': {'rev_growth': 0.10, 'expense_growth': 0.05},\n    'Cut to survive': {'rev_growth': 0.03, 'expense_growth': -0.10},\n}\n\nfor name, params in scenarios.items():\n    cash = cash_on_hand\n    rev = monthly_revenue\n    exp = monthly_expenses\n    months = 0\n    while cash > 0 and months < 36:\n        net_burn = exp - rev\n        cash -= net_burn\n        rev *= (1 + params['rev_growth'])\n        exp *= (1 + params['expense_growth'])\n        months += 1\n    print(f\"{name}: {months} months runway\")\n    print(f\"  Monthly net burn today: ${monthly_expenses - monthly_revenue:,.0f}\")" },
      { type: "markdown", content: "## Expense Breakdown\n\n| Category | Monthly | % of Total | Essential? |\n|----------|---------|-----------|------------|\n| People | | | |\n| Cloud/Infra | | | |\n| Marketing | | | |\n| Office/G&A | | | |\n| Software | | | |\n\n## Recommended Actions\n\n- If runway < 6 months: \n- If runway 6-12 months: \n- If runway > 12 months: " },
    ],
  },
  {
    id: "finance-financial-model",
    title: "Financial Model",
    description: "Revenue, cost structure, P&L projection, and sensitivity analysis",
    category: "finance",
    icon: "FileSpreadsheet",
    cells: [
      { type: "markdown", content: "# Financial Model\n\nThree-statement financial model for [company]. Covers revenue model, cost structure, P&L, and sensitivity analysis." },
      { type: "ai-prompt", content: "Outline a financial model structure for a [B2B SaaS / marketplace / e-commerce] company. Define: revenue drivers (users x conversion x ARPU), cost categories (COGS, S&M, R&D, G&A), and key assumptions. What level of detail is appropriate for a [seed/Series A/Series B] company?" },
      { type: "code", content: "# Simplified P&L projection\nimport pandas as pd\n\nyears = ['Y1', 'Y2', 'Y3']\nrevenue = [1200000, 3000000, 7200000]\ncogs_pct = 0.22\nsm_pct = [0.45, 0.40, 0.35]\nrd_pct = [0.30, 0.25, 0.20]\nga_pct = [0.15, 0.12, 0.10]\n\nfor i, year in enumerate(years):\n    rev = revenue[i]\n    cogs = rev * cogs_pct\n    gross = rev - cogs\n    sm = rev * sm_pct[i]\n    rd = rev * rd_pct[i]\n    ga = rev * ga_pct[i]\n    opex = sm + rd + ga\n    ebitda = gross - opex\n    print(f\"\\n{year}:\")\n    print(f\"  Revenue:       ${rev:>12,.0f}\")\n    print(f\"  COGS:          ${cogs:>12,.0f}  ({cogs_pct*100:.0f}%)\")\n    print(f\"  Gross Profit:  ${gross:>12,.0f}  ({gross/rev*100:.0f}%)\")\n    print(f\"  S&M:           ${sm:>12,.0f}  ({sm_pct[i]*100:.0f}%)\")\n    print(f\"  R&D:           ${rd:>12,.0f}  ({rd_pct[i]*100:.0f}%)\")\n    print(f\"  G&A:           ${ga:>12,.0f}  ({ga_pct[i]*100:.0f}%)\")\n    print(f\"  EBITDA:        ${ebitda:>12,.0f}  ({ebitda/rev*100:.0f}%)\")" },
      { type: "markdown", content: "## Key Assumptions\n\n| Assumption | Y1 | Y2 | Y3 | Source |\n|-----------|-----|-----|-----|--------|\n| Revenue growth | | | | |\n| Gross margin | | | | |\n| S&M as % of rev | | | | |\n| Headcount | | | | |\n\n## Sensitivity Analysis\n\nWhat is the impact on Y3 EBITDA if:\n- Revenue grows 20% slower?\n- Gross margin drops 5 points?\n- Churn increases by 2%?" },
    ],
  },
  {
    id: "finance-pricing-sensitivity",
    title: "Pricing Sensitivity",
    description: "Price elasticity analysis and optimal price point discovery",
    category: "finance",
    icon: "SlidersHorizontal",
    cells: [
      { type: "markdown", content: "# Pricing Sensitivity Analysis\n\nDetermine optimal pricing through willingness-to-pay analysis, price elasticity modeling, and competitive benchmarking." },
      { type: "ai-prompt", content: "Explain the Van Westendorp Price Sensitivity Meter methodology. How should a [industry] company design a pricing survey to determine: the range of acceptable prices, the optimal price point, and the point of marginal cheapness/expensiveness?" },
      { type: "code", content: "# Price sensitivity model\nimport numpy as np\n\n# Simulated survey data (price points and % who would buy)\nprice_points = [29, 49, 79, 99, 149, 199, 299]\ndemand_pct = [92, 85, 68, 55, 35, 20, 8]  # % willing to pay\nbase_customers = 10000\n\nprint(f'{\"Price\":>8} {\"Demand\":>8} {\"Customers\":>10} {\"Revenue\":>12}')\nprint('-' * 42)\n\nbest_revenue = 0\nbest_price = 0\n\nfor price, demand in zip(price_points, demand_pct):\n    customers = int(base_customers * demand / 100)\n    revenue = price * customers\n    if revenue > best_revenue:\n        best_revenue = revenue\n        best_price = price\n    marker = ' <-- optimal' if price == best_price and revenue == best_revenue else ''\n    print(f'${price:>7} {demand:>7}% {customers:>10,} ${revenue:>11,}{marker}')\n\nprint(f'\\nOptimal price: ${best_price} (maximizes revenue at ${best_revenue:,})')" },
      { type: "markdown", content: "## Recommendations\n\n- **Optimal price point:** $[X]/mo\n- **Expected conversion impact:** \n- **Revenue impact vs. current pricing:** \n- **Implementation plan:** " },
    ],
  },
  {
    id: "finance-cac-ltv",
    title: "CAC / LTV Analysis",
    description: "Acquisition cost vs. lifetime value deep dive with payback",
    category: "finance",
    icon: "Scale",
    cells: [
      { type: "markdown", content: "# CAC / LTV Analysis\n\nDetailed breakdown of customer acquisition cost and lifetime value by segment and channel. Identify the most efficient growth paths." },
      { type: "ai-prompt", content: "Break down CAC calculation for a [industry] company by channel: paid search, paid social, content/SEO, outbound sales, partnerships, and events. For each channel, list the cost components to include (ad spend, salaries, tools, commissions) and typical CAC ranges." },
      { type: "code", content: "# CAC/LTV by segment\nimport pandas as pd\n\nsegments = pd.DataFrame({\n    'Segment': ['Enterprise', 'Mid-Market', 'SMB', 'Self-Serve'],\n    'CAC': [15000, 5000, 1200, 250],\n    'Monthly_ARPU': [5000, 1500, 200, 50],\n    'Gross_Margin': [0.82, 0.80, 0.75, 0.70],\n    'Avg_Lifetime_Months': [48, 36, 24, 18],\n})\n\nsegments['LTV'] = segments['Monthly_ARPU'] * segments['Gross_Margin'] * segments['Avg_Lifetime_Months']\nsegments['LTV_CAC_Ratio'] = (segments['LTV'] / segments['CAC']).round(1)\nsegments['Payback_Months'] = (segments['CAC'] / (segments['Monthly_ARPU'] * segments['Gross_Margin'])).round(1)\n\nprint(segments.to_markdown(index=False))\nprint(f\"\\nBest LTV:CAC ratio: {segments.loc[segments['LTV_CAC_Ratio'].idxmax(), 'Segment']}\")\nprint(f\"Fastest payback: {segments.loc[segments['Payback_Months'].idxmin(), 'Segment']}\")" },
      { type: "markdown", content: "## Strategic Implications\n\n- **Invest more in:** [segment with best LTV:CAC]\n- **Optimize:** [segment with longest payback]\n- **Watch:** [segment with declining metrics]\n\n## Quarterly Trend\n\n| Quarter | Blended CAC | Blended LTV | LTV:CAC | Payback |\n|---------|------------|------------|---------|--------|\n| Q1 | | | | |\n| Q2 | | | | |\n| Q3 | | | | |\n| Q4 | | | | |" },
    ],
  },

  // ---------------------------------------------------------------------------
  // RESEARCH (10)
  // ---------------------------------------------------------------------------
  {
    id: "research-customer-interviews",
    title: "Customer Interview Analysis",
    description: "Synthesize interview themes, insights, and action items",
    category: "research",
    icon: "MessageSquare",
    cells: [
      { type: "markdown", content: "# Customer Interview Analysis\n\n**Interviews conducted:** [count]\n**Period:** [dates]\n**Objective:** [research question]\n\nSynthesize qualitative insights from customer interviews into actionable themes." },
      { type: "ai-prompt", content: "Provide a framework for analyzing qualitative customer interview data. Cover: how to code responses, identify themes, handle contradictory data, assess theme strength (frequency + intensity), and translate findings into product/marketing actions." },
      { type: "markdown", content: "## Interview Log\n\n| # | Customer | Segment | Date | Key Quote |\n|---|---------|---------|------|----------|\n| 1 | | | | |\n| 2 | | | | |\n| 3 | | | | |" },
      { type: "markdown", content: "## Theme Analysis\n\n### Theme 1: [Name]\n- **Frequency:** [X] of [Y] interviews\n- **Supporting quotes:** \n- **Implication:** \n\n### Theme 2: [Name]\n- **Frequency:** [X] of [Y] interviews\n- **Supporting quotes:** \n- **Implication:** " },
      { type: "markdown", content: "## Action Items\n\n| Insight | Action | Owner | Priority | Impact |\n|---------|--------|-------|----------|--------|\n| | | | | |\n| | | | | |" },
    ],
  },
  {
    id: "research-persona-builder",
    title: "User Persona Builder",
    description: "Data-driven persona profiles with behavioral patterns",
    category: "research",
    icon: "UserCircle",
    cells: [
      { type: "markdown", content: "# User Persona Builder\n\nCreate detailed, data-backed user personas to align product, marketing, and sales teams." },
      { type: "ai-prompt", content: "Build a detailed user persona for the primary buyer of [product] in [industry]. Include: name and role, demographics, company profile, goals and motivations, pain points and frustrations, buying process, information sources, success metrics, and objections to purchase." },
      { type: "markdown", content: "## Persona 1: [Name]\n\n**Title:** \n**Company type:** \n**Reports to:** \n\n### Goals\n1. \n2. \n3. \n\n### Pain Points\n1. \n2. \n3. \n\n### Day in the Life\n- Morning: \n- Midday: \n- Afternoon: \n\n### How They Evaluate Solutions\n- Must-haves: \n- Nice-to-haves: \n- Dealbreakers: " },
      { type: "ai-prompt", content: "Build a secondary user persona -- the day-to-day user (not the buyer) of [product]. How do their needs, goals, and evaluation criteria differ from the buyer persona? What features matter most to them vs. the buyer?" },
    ],
  },
  {
    id: "research-market-sizing",
    title: "Market Sizing",
    description: "Top-down and bottom-up market size estimation with triangulation",
    category: "research",
    icon: "Maximize",
    cells: [
      { type: "markdown", content: "# Market Sizing Analysis\n\nEstimate market size using multiple methodologies and triangulate for confidence." },
      { type: "ai-prompt", content: "Estimate the market size for [product/service] using a top-down approach. Start with the broadest relevant market, then narrow by: geography, industry vertical, company size, and product fit. Cite industry reports and data sources." },
      { type: "ai-prompt", content: "Estimate the market size for [product/service] using a bottom-up approach. Start with: number of potential customers, expected adoption rate, average revenue per customer. Build up from individual customer economics." },
      { type: "code", content: "# Market sizing triangulation\ntop_down_tam = 12000000000  # $12B from industry reports\nbottom_up_tam = 8500000000   # $8.5B from customer count x ACV\nanalyst_estimate = 10000000000  # $10B from analyst consensus\n\navg_tam = (top_down_tam + bottom_up_tam + analyst_estimate) / 3\n\nprint('Market Sizing Triangulation')\nprint(f'  Top-down:       ${top_down_tam/1e9:.1f}B')\nprint(f'  Bottom-up:      ${bottom_up_tam/1e9:.1f}B')\nprint(f'  Analyst est.:   ${analyst_estimate/1e9:.1f}B')\nprint(f'  Average:        ${avg_tam/1e9:.1f}B')\nprint(f'  Range:          ${min(top_down_tam,bottom_up_tam,analyst_estimate)/1e9:.1f}B - ${max(top_down_tam,bottom_up_tam,analyst_estimate)/1e9:.1f}B')\nprint(f'\\nConfidence: {\"High\" if (max(top_down_tam,bottom_up_tam,analyst_estimate) / min(top_down_tam,bottom_up_tam,analyst_estimate)) < 1.5 else \"Medium\" if (max(top_down_tam,bottom_up_tam,analyst_estimate) / min(top_down_tam,bottom_up_tam,analyst_estimate)) < 2 else \"Low\"}')" },
      { type: "markdown", content: "## Data Sources\n\n| Source | Estimate | Year | Notes |\n|--------|---------|------|-------|\n| | | | |\n\n## Confidence Assessment\n\n- **Strongest estimate:** \n- **Key uncertainties:** \n- **What would change the sizing significantly:** " },
    ],
  },
  {
    id: "research-technology-assessment",
    title: "Technology Assessment",
    description: "Evaluate technology landscape and make build/buy recommendations",
    category: "research",
    icon: "Cpu",
    cells: [
      { type: "markdown", content: "# Technology Assessment\n\n**Technology area:** [area]\n**Purpose:** Evaluate options and recommend build vs. buy vs. partner\n\nStructured evaluation of technology options for a specific capability." },
      { type: "ai-prompt", content: "Map the technology landscape for [technology area]. Identify the major categories of solutions, leading vendors in each, open-source alternatives, and emerging approaches. Provide a maturity assessment for each." },
      { type: "markdown", content: "## Evaluation Criteria\n\n| Criterion | Weight | Option A | Option B | Option C |\n|-----------|--------|----------|----------|----------|\n| Functionality fit | 25% | | | |\n| Scalability | 20% | | | |\n| Integration ease | 20% | | | |\n| Total cost (3yr) | 15% | | | |\n| Vendor viability | 10% | | | |\n| Time to implement | 10% | | | |\n| **Weighted Score** | **100%** | | | |" },
      { type: "ai-prompt", content: "For [technology capability], compare the build vs. buy tradeoffs. Consider: upfront cost, ongoing maintenance, customization needs, time to value, strategic importance, and team capability. Under what conditions should [company] build vs. buy?" },
    ],
  },
  {
    id: "research-vendor-comparison",
    title: "Vendor Comparison",
    description: "Structured vendor evaluation with scoring matrix",
    category: "research",
    icon: "GitCompare",
    cells: [
      { type: "markdown", content: "# Vendor Comparison\n\n**Category:** [vendor category]\n**Decision date:** [date]\n**Budget:** $[amount]\n\nObjective evaluation of vendor options for [use case]." },
      { type: "ai-prompt", content: "Identify the top 5 vendors for [category] in [industry]. For each, provide: company overview, pricing model, key strengths, key weaknesses, ideal customer profile, and notable customers. Include at least one emerging/challenger vendor." },
      { type: "code", content: "# Vendor scoring matrix\nimport pandas as pd\n\ncriteria = [\n    ('Feature completeness', 0.25),\n    ('Ease of integration', 0.20),\n    ('Price/value', 0.20),\n    ('Support quality', 0.15),\n    ('Scalability', 0.10),\n    ('Vendor stability', 0.10),\n]\n\n# Scores out of 10\nvendors = {\n    'Vendor A': [8, 7, 6, 8, 9, 9],\n    'Vendor B': [7, 9, 8, 7, 7, 8],\n    'Vendor C': [9, 6, 5, 6, 8, 7],\n}\n\nprint(f'{\"Criterion\":<25} {\"Weight\":<8}', end='')\nfor v in vendors:\n    print(f' {v:<12}', end='')\nprint()\nprint('-' * 70)\n\ntotals = {v: 0 for v in vendors}\nfor i, (crit, weight) in enumerate(criteria):\n    print(f'{crit:<25} {weight:<8.0%}', end='')\n    for v, scores in vendors.items():\n        weighted = scores[i] * weight\n        totals[v] += weighted\n        print(f' {scores[i]:<12}', end='')\n    print()\n\nprint('-' * 70)\nprint(f'{\"WEIGHTED TOTAL\":<33}', end='')\nfor v in vendors:\n    print(f' {totals[v]:<12.1f}', end='')\nprint(f'\\n\\nRecommendation: {max(totals, key=totals.get)}')" },
      { type: "markdown", content: "## Recommendation\n\n**Selected vendor:** \n**Rationale:** \n**Risks and mitigations:** \n**Next steps:** \n1. \n2. \n3. " },
    ],
  },
  {
    id: "research-survey-analysis",
    title: "Survey Analysis",
    description: "Survey response synthesis with statistical analysis",
    category: "research",
    icon: "ClipboardCheck",
    cells: [
      { type: "markdown", content: "# Survey Analysis\n\n**Survey:** [name]\n**Respondents:** [count]\n**Period:** [dates]\n**Response rate:** [X]%\n\nAnalyze survey responses to extract actionable insights." },
      { type: "ai-prompt", content: "Provide a framework for analyzing a [customer satisfaction / market research / product feedback] survey with [X] responses. Cover: data cleaning steps, statistical tests to run, how to handle open-ended responses, and how to present findings to stakeholders." },
      { type: "code", content: "# Survey analysis template\nimport pandas as pd\nimport numpy as np\n\n# Simulated Likert scale data\nnp.random.seed(42)\nn_responses = 200\n\ndata = pd.DataFrame({\n    'Overall_Satisfaction': np.random.choice([1,2,3,4,5], n_responses, p=[0.05,0.10,0.20,0.40,0.25]),\n    'Ease_of_Use': np.random.choice([1,2,3,4,5], n_responses, p=[0.03,0.08,0.25,0.38,0.26]),\n    'Value_for_Money': np.random.choice([1,2,3,4,5], n_responses, p=[0.08,0.15,0.30,0.30,0.17]),\n    'Likely_to_Recommend': np.random.choice([0,1,2,3,4,5,6,7,8,9,10], n_responses),\n})\n\nprint('Survey Results Summary')\nprint('=' * 40)\nfor col in ['Overall_Satisfaction', 'Ease_of_Use', 'Value_for_Money']:\n    print(f'\\n{col.replace(\"_\", \" \")}:')\n    print(f'  Mean: {data[col].mean():.2f} / 5.00')\n    print(f'  Median: {data[col].median():.1f}')\n    print(f'  % Positive (4-5): {(data[col] >= 4).mean()*100:.0f}%')\n\n# NPS calculation\npromoters = (data['Likely_to_Recommend'] >= 9).sum()\ndetractors = (data['Likely_to_Recommend'] <= 6).sum()\nnps = (promoters - detractors) / n_responses * 100\nprint(f'\\nNPS: {nps:.0f}')" },
      { type: "markdown", content: "## Key Findings\n\n1. \n2. \n3. \n\n## Segment Differences\n\n| Segment | Satisfaction | NPS | Key Difference |\n|---------|------------|-----|----------------|\n| | | | |\n\n## Recommended Actions\n\n| Finding | Action | Priority | Owner |\n|---------|--------|----------|-------|\n| | | | |" },
    ],
  },
  {
    id: "research-trend-radar",
    title: "Trend Radar",
    description: "Map emerging trends by impact and timeline to adoption",
    category: "research",
    icon: "Radar",
    cells: [
      { type: "markdown", content: "# Trend Radar\n\n**Industry:** [industry]\n**Horizon:** 1-5 years\n\nMap emerging trends and technologies by proximity to mainstream adoption and potential impact." },
      { type: "ai-prompt", content: "Identify 15-20 emerging trends affecting [industry] over the next 1-5 years. For each, classify into: Adopt (ready now), Trial (experiment next 6-12 months), Assess (watch next 1-2 years), or Hold (2-5 years out). Include technology, business model, and regulatory trends." },
      { type: "markdown", content: "## Trend Radar\n\n### Adopt (Now)\n| Trend | Impact | Our Readiness | Action |\n|-------|--------|--------------|--------|\n| | | | |\n\n### Trial (6-12 months)\n| Trend | Impact | Our Readiness | Action |\n|-------|--------|--------------|--------|\n| | | | |\n\n### Assess (1-2 years)\n| Trend | Impact | Our Readiness | Action |\n|-------|--------|--------------|--------|\n| | | | |\n\n### Hold (2-5 years)\n| Trend | Impact | Our Readiness | Action |\n|-------|--------|--------------|--------|\n| | | | |" },
      { type: "ai-prompt", content: "For the top 5 most impactful trends on the radar, provide a deeper analysis: driving forces, early signals of acceleration, potential impact on [company]'s business model, and what we should do now to prepare." },
    ],
  },
  {
    id: "research-patent-landscape",
    title: "Patent Landscape",
    description: "Patent analysis to identify key players and whitespace",
    category: "research",
    icon: "FileKey",
    cells: [
      { type: "markdown", content: "# Patent Landscape Analysis\n\n**Technology area:** [area]\n**Search scope:** [geographies, date range]\n\nMap the intellectual property landscape to identify key players, trends, and whitespace opportunities." },
      { type: "ai-prompt", content: "Analyze the patent landscape for [technology area]. Identify: top patent holders (by volume), recent filing trends, key patent clusters, and geographic distribution. Highlight any foundational patents that could affect freedom to operate." },
      { type: "markdown", content: "## Key Players\n\n| Company | Patent Count | Focus Areas | Notable Patents |\n|---------|-------------|-------------|----------------|\n| | | | |\n\n## Whitespace Analysis\n\nAreas with low patent density that represent opportunities:\n1. \n2. \n3. \n\n## Freedom to Operate Assessment\n\n- **High risk areas:** \n- **Medium risk areas:** \n- **Clear areas:** " },
      { type: "ai-prompt", content: "Based on the patent landscape for [technology area], recommend 3-5 areas where [company] should consider filing patents to protect its competitive position. For each, explain the strategic rationale and estimated filing cost." },
    ],
  },
  {
    id: "research-regulatory-scan",
    title: "Regulatory Scan",
    description: "Regulatory environment overview with compliance requirements",
    category: "research",
    icon: "Scale",
    cells: [
      { type: "markdown", content: "# Regulatory Scan\n\n**Industry:** [industry]\n**Jurisdictions:** [geographies]\n**Date:** [date]\n\nComprehensive scan of the regulatory environment affecting [company/product]." },
      { type: "ai-prompt", content: "Provide an overview of the regulatory landscape affecting [industry] in [jurisdictions]. Cover: existing regulations, pending legislation, enforcement trends, and expected changes in the next 12-24 months. Highlight any regulations that could significantly impact [company]'s business model." },
      { type: "markdown", content: "## Compliance Requirements\n\n| Regulation | Jurisdiction | Applies To | Compliance Deadline | Status |\n|-----------|-------------|-----------|--------------------|---------|\n| | | | | |\n\n## Impact Assessment\n\n| Regulatory Change | Probability | Impact | Preparedness | Action Needed |\n|------------------|------------|--------|-------------|---------------|\n| | | | | |" },
      { type: "ai-prompt", content: "What are the top 3 regulatory risks for [company] in the next 24 months? For each, provide: the specific regulation, likelihood of enforcement, potential impact (revenue, operations, product), and recommended mitigation steps." },
    ],
  },
  {
    id: "research-literature-review",
    title: "Academic Literature Review",
    description: "Systematic review of research papers and methodology gaps",
    category: "research",
    icon: "BookOpen",
    cells: [
      { type: "markdown", content: "# Academic Literature Review\n\n**Topic:** [research topic]\n**Search scope:** [databases, date range]\n**Research question:** [specific question]\n\nSystematic review of academic and industry research." },
      { type: "ai-prompt", content: "Conduct a literature review on [topic]. Identify the top 10-15 most cited and relevant papers from the past 5 years. For each, provide: authors, year, key findings, methodology, and relevance to [research question]. Organize by theme." },
      { type: "markdown", content: "## Theme 1: [Name]\n\n| Paper | Authors (Year) | Key Finding | Methodology | Relevance |\n|-------|---------------|-------------|-------------|----------|\n| | | | | |\n\n## Theme 2: [Name]\n\n| Paper | Authors (Year) | Key Finding | Methodology | Relevance |\n|-------|---------------|-------------|-------------|----------|\n| | | | | |" },
      { type: "markdown", content: "## Methodology Assessment\n\n- **Most rigorous studies:** \n- **Common limitations:** \n- **Gaps in the literature:** \n\n## Implications for [Company/Product]\n\n1. \n2. \n3. " },
      { type: "ai-prompt", content: "Based on the literature review on [topic], identify the 3 biggest gaps in current research that represent opportunities for [company] to generate proprietary insights. What data or experiments would be needed to fill these gaps?" },
    ],
  },
];

export function getTemplatesByCategory(category: TemplateCategory | "all"): Template[] {
  if (category === "all") return TEMPLATES;
  return TEMPLATES.filter((t) => t.category === category);
}

export function searchTemplates(query: string, category: TemplateCategory | "all" = "all"): Template[] {
  const filtered = getTemplatesByCategory(category);
  if (!query) return filtered;
  const lower = query.toLowerCase();
  return filtered.filter(
    (t) => t.title.toLowerCase().includes(lower) || t.description.toLowerCase().includes(lower)
  );
}

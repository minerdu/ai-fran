// ============================================================
// Skill 中心 + 品牌建模 + 财务模型 — 综合数据目录
// ============================================================

// ---- 标杆企业 ----
export const BENCHMARK_BRANDS = [
  {
    id: 'bench_fanwenhua',
    name: '樊文花',
    logo: '🌸',
    color: '#ec4899',
    industry: '面部护理连锁',
    storeCount: '6000+',
    founded: '2003年',
    tagline: '面部护理专家，全国门店数NO.1',
    highlights: ['标准化运营体系', '供应链全国覆盖', '4阶段培训', '数字化督导'],
    investRange: '50-100万',
    avgROI: '18-24个月回本',
    status: 'active',
  },
  {
    id: 'bench_nairuier',
    name: '奈瑞儿',
    logo: '💆',
    color: '#8b5cf6',
    industry: '高端美容SPA',
    storeCount: '300+',
    founded: '2005年',
    tagline: '高端美容SPA，会员制深度服务',
    highlights: ['高客单价模式', '会员储值体系', '区域独家保护', '医美联动'],
    investRange: '80-150万',
    avgROI: '20-30个月回本',
    status: 'active',
  },
  {
    id: 'bench_meilitianyuan',
    name: '美丽田园',
    logo: '✨',
    color: '#14b8a6',
    industry: '综合美容连锁',
    storeCount: '1000+',
    founded: '2001年',
    tagline: '多店型灵活加盟，城市合伙人模式',
    highlights: ['多店型覆盖', '城市合伙人机制', '灵活投资门槛', '品牌矩阵'],
    investRange: '30-120万',
    avgROI: '12-20个月回本',
    status: 'active',
  },
];

// ---- 9大招商环节定义 ----
export const FRANCHISE_STAGES = [
  { key: 'lead_capture', label: '线索接待', icon: '📋', color: '#1890ff' },
  { key: 'qualification', label: '资格评估', icon: '🔍', color: '#0ea5e9' },
  { key: 'nurturing', label: '线索培育', icon: '🌱', color: '#52c41a' },
  { key: 'policy_match', label: '政策匹配', icon: '📑', color: '#8b5cf6' },
  { key: 'visit_invite', label: '总部考察', icon: '🏢', color: '#fa8c16' },
  { key: 'event_followup', label: '会务跟进', icon: '📅', color: '#14b8a6' },
  { key: 'negotiation', label: '报价谈判', icon: '💰', color: '#ef4444' },
  { key: 'sign_push', label: '签约推进', icon: '✍️', color: '#f5222d' },
  { key: 'silent_wake', label: '沉默激活', icon: '🔔', color: '#a0d911' },
];

// ---- 樊文花各环节 Skill 拆解 ----
export const FANWENHUA_SKILLS = {
  lead_capture: {
    rules: ['首次响应必须在5分钟内', '自动发送品牌介绍视频+电子手册', '24小时内完成首次电话沟通'],
    scripts: ['您好，我是樊文花品牌招商顾问，感谢您的关注！我们目前在全国拥有6000+门店...', '请问您之前有美业经营经验吗？您主要关注哪个城市的开店机会？'],
    metrics: { responseRate: '92%', firstCallRate: '85%', leadToQualified: '45%' },
    objections: [
      { q: '樊文花品牌知名度如何？', a: '6000+门店覆盖全国300+城市，连续5年面部护理行业第一' },
      { q: '加盟费用太高了', a: '我们提供社区店30万起的轻投资方案，回本周期最快12个月' },
    ],
    materials: ['品牌介绍视频(3分钟)', '电子版加盟手册', '门店实拍图册', '成功案例一页纸'],
  },
  qualification: {
    rules: ['投资能力评估：最低30万现金+商业经验', '城市覆盖度检查：确保区域未饱和', '信用背景初筛'],
    scripts: ['为了给您匹配最合适的加盟方案，我需要了解几个关键信息...', '您的预算区间大概在什么范围？是否有合适的选址方向？'],
    metrics: { qualificationRate: '60%', avgAssessTime: '2天', dropRate: '15%' },
    objections: [
      { q: '为什么需要审核资质？', a: '为了保障每位加盟商的投资回报，我们会评估区域市场容量和经营可行性' },
    ],
    materials: ['加盟商资质评估表', '区域市场饱和度地图', '投资能力自测工具'],
  },
  nurturing: {
    rules: ['每周至少2次有效触达', '发送同城/同行业成功案例', '定期推送品牌动态与新品信息', '沉默7天自动触发唤醒流程'],
    scripts: ['分享一下我们在您所在城市的最新开店案例，这家店3个月就实现了盈利...', '我们下周有一场线上招商直播，会详细介绍最新的加盟政策，要不要给您预留名额？'],
    metrics: { nurtureToVisit: '35%', avgNurtureDays: '14天', contentOpenRate: '68%' },
    objections: [
      { q: '我还在考虑中', a: '理解，大投资需要谨慎。我给您发几个和您情况类似的加盟商案例参考' },
    ],
    materials: ['同城成功案例集', '品牌月刊', '新品/新政策通知', '培训体系介绍视频'],
  },
  policy_match: {
    rules: ['根据城市级别匹配对应加盟政策', '投资门槛按店型分级报价', '区域保护半径不低于1.5公里', '首批物料和装修补贴按政策执行'],
    scripts: ['根据您选择的XX城市，我们目前提供三种店型方案...', '目前Q2有专属优惠政策，加盟费减免X万，装修补贴X万，截止到...'],
    metrics: { policyMatchRate: '78%', avgNegotiationRounds: '2.3轮', discountUsage: '45%' },
    objections: [
      { q: '能不能再优惠？', a: '目前Q2政策已经是最大力度，过了这个时间窗口就恢复原价了' },
      { q: '区域保护范围太小', a: '1.5公里是基础保护，业绩达标后可升级为3公里独家区域' },
    ],
    materials: ['分城市加盟政策表', '店型对比手册', '区域保护协议模板', 'Q2限时政策一页纸'],
  },
  visit_invite: {
    rules: ['高意向线索48小时内安排考察邀约', '提供往返交通+住宿安排', '标杆门店参观+总部展厅+创始人见面', '考察后24小时内跟进反馈'],
    scripts: ['王总，您之前提到很关注我们的供应链体系，这次来总部可以实地参观...', '考察期间我们安排了标杆门店实地体验，您可以直接和店长交流经营心得'],
    metrics: { visitToSign: '55%', avgVisitDuration: '1.5天', satisfactionRate: '92%' },
    objections: [
      { q: '来回考察太花时间', a: '我们提供1.5天精简考察路线，包含所有核心环节，交通住宿全包' },
    ],
    materials: ['考察行程表', '标杆门店清单', '往返交通预定确认', '考察反馈表'],
  },
  event_followup: {
    rules: ['招商会后2小时内发送感谢函', '24小时内完成参会意向分级', '高意向客户48小时内安排一对一沟通', '未到场客户发送会议回放+资料包'],
    scripts: ['感谢您参加今天的招商说明会，我整理了会上的核心要点和您关注的问题...', '针对您在会上提出的选址问题，我们的专业选址团队可以免费帮您做评估'],
    metrics: { postEventFollowRate: '95%', eventToVisit: '40%', noShowRecovery: '25%' },
    objections: [
      { q: '会上说的和实际有差距吗？', a: '所有数据都有标杆门店实际经营数据支撑，欢迎实地考察验证' },
    ],
    materials: ['招商会纪要', '参会客户分级表', 'Q&A汇总文档', '会议回放链接'],
  },
  negotiation: {
    rules: ['报价单必须包含完整费用明细', '谈判不超过3轮，超时升级主管介入', '价格底线需审批确认', '竞品比价需提供差异化说明'],
    scripts: ['这是我们的标准报价方案，包含了所有费用明细和后续支持...', '相比竞品，我们多提供的是全国供应链和持续培训赋能，这些的长期价值远超加盟费差异'],
    metrics: { negotiationToSign: '65%', avgNegotiationDays: '7天', priceAcceptRate: '72%' },
    objections: [
      { q: '别家品牌加盟费更低', a: '加盟费只是初始成本，持续的供应链效率和培训赋能才是长期盈利关键' },
      { q: '能不能分期付款', a: '我们支持首付50%+季度分期，降低初始资金压力' },
    ],
    materials: ['标准报价单', '费用明细对照表', '竞品对比分析', '合同条款说明'],
  },
  sign_push: {
    rules: ['签约前完成合规审查', '合同条款逐条确认', '首付+保证金到账后启动选址', '签约当日完成开店筹建时间表'],
    scripts: ['恭喜您成为樊文花的合作伙伴！接下来我们会启动开店筹建流程...', '合同签订后，3天内选址团队会联系您启动商圈评估'],
    metrics: { signCompletionRate: '88%', avgSignToOpenDays: '45天', contractDisputeRate: '2%' },
    objections: [
      { q: '合同条款不太理解', a: '我们安排法务专员逐条解读，确保您对每一条都清楚明白' },
    ],
    materials: ['加盟合同标准版', '开店筹建时间表', '选址评估申请表', '首批订货清单'],
  },
  silent_wake: {
    rules: ['沉默7天触发自动唤醒', '发送同城新开店案例', '推送限时政策优惠', '3次唤醒无效转入长期培育池'],
    scripts: ['王总，最近您所在城市又有一家新店开业了，首月营收就突破了20万...', '我们Q2推出了特别优惠政策，之前您关注的加盟费问题现在有了新方案'],
    metrics: { wakeUpRate: '28%', reactivationToSign: '15%', avgSilentDays: '21天' },
    objections: [
      { q: '暂时不考虑了', a: '理解，我把最新的行业报告发您参考，有想法随时联系我' },
    ],
    materials: ['同城新开店案例', '限时政策优惠单页', '行业趋势报告', '老带新激励方案'],
  },
};

// ---- 品牌建模结构化数据 ----
export const BRAND_MODEL_SECTIONS = [
  {
    key: 'profile',
    title: '品牌基础画像',
    icon: '🏢',
    fields: [
      { key: 'brandName', label: '品牌名称', type: 'text', value: '樊文花面部护理专家' },
      { key: 'oneLiner', label: '一句话定位', type: 'text', value: '36年专注面部护理，全国6000+门店的面部护理绝对头部品牌' },
      { key: 'industry', label: '行业细分', type: 'tags', value: ['大美业', '轻美容', '面部专研护理', '产品+服务模式'] },
      { key: 'brandCore', label: '核心壁垒', type: 'text', value: '中式面部护理开创者，拥有独立科研生产基地与52项国家专利，主打“清排调补”四部曲，产品复购率高达80%。' },
      { key: 'storeCount', label: '当前规模', type: 'text', value: '全国6000+门店，覆盖300+城市，全国商场/社区高密度渗透。' },
      { key: 'targetCities', label: '招商战略重点', type: 'tags', value: ['三四线下沉市场', '百强县', '社区周边', '部分空白新一线'] },
    ],
  },
  {
    key: 'storeModels',
    title: '门店模型',
    icon: '🏪',
    fields: [
      { key: 'flagship', label: '城市旗舰店（商场/核心商圈）', type: 'card', value: { area: '120-150㎡', invest: '60-80万', staff: '8-10人', revenue: '30-45万/月' } },
      { key: 'standard', label: '标准店（社区/次商圈）', type: 'card', value: { area: '60-80㎡', invest: '30-40万', staff: '4-6人', revenue: '15-25万/月' } },
      { key: 'micro', label: '微型下沉店（乡镇/县城）', type: 'card', value: { area: '40-50㎡', invest: '15-20万', staff: '2-3人', revenue: '8-15万/月' } },
    ],
  },
  {
    key: 'policies',
    title: '加盟政策',
    icon: '📋',
    fields: [
      { key: 'joinFee', label: '品牌加盟费', type: 'text', value: '阶梯式收费：微型店免加盟费 / 标准店9.8万 / 旗舰店15.8万（限时活动有减免额度）' },
      { key: 'deposit', label: '履约保证金', type: 'text', value: '3万元（合同期满无违约全额退还，严防串货乱价）' },
      { key: 'equipment', label: '首批物料及设备', type: 'text', value: '按照店型直供：微店8万，标准店15万，包含全套核心美容仪器、客装及院装产品。' },
      { key: 'regionProtect', label: '区域商圈保护', type: 'text', value: '严格实行商圈保护：一线城市1.5公里绝对保护，县级城市原则上实行“一镇一店”。' },
      { key: 'contractTerm', label: '合作期限与分成', type: 'text', value: '首签3年，免收流水抽成（0管理费），门店收入100%归属加盟商，总部仅靠后期耗材复购获取利润。' },
    ],
  },
  {
    key: 'enablement',
    title: '总部赋能',
    icon: '🎓',
    fields: [
      { key: 'training', label: '全链路商学院体系', type: 'tags', value: ['店长进阶营(14天)', '美导特训营(7天)', '老板经营总裁班', '开业到店带教(15天)'] },
      { key: 'supplyChain', label: '供应链与物流', type: 'text', value: '自建广州花都4万平米工业4.0智慧工厂，全国8大区域仓储直发，实现核心耗材“48小时到店”，确保成本最优。' },
      { key: 'siteSelection', label: '选址与装修支持', type: 'text', value: '总部选址铁军提供“六维测算模型”免费上门选址，提供统一SI/VI图纸，并提供最高5万元的货架/门头装修补贴。' },
      { key: 'marketing', label: '全域拓客引流', type: 'text', value: '美团/大众点评总部统一代运营，“小红书+抖音”本地生活矩阵引流，确保开业首月至少获取200+精准本地客资。' },
    ],
  },
  {
    key: 'risks',
    title: '风险与疑虑处理',
    icon: '⚠️',
    fields: [
      { key: 'items', label: '客户核心痛点与拆解', type: 'tags', value: ['【资金】预算不足：提供保证金分期，或推微型店方案', '【经验】无美业经验：总部整店输出，美容师由总部统一定向输送', '【客源】怕没客户：美团/团购打通，开业期督导亲自带店拓客', '【竞品】本地有强势老品牌：强调樊文花“面部专研”和“平价高频”降维打击'] },
      { key: 'risk_notice', label: '风险前置提示', type: 'text', value: '明确告知门店盈利的核心在于“美导的专业服务留存率”，总部不承诺绝对保底营收，投资需具备半年左右的现金流抗风险能力。' },
    ],
  },
];

export const BRAND_MODEL_COMPLETION = [
  { section: '品牌基础画像', percent: 95, status: 'complete' },
  { section: '门店模型', percent: 90, status: 'complete' },
  { section: '加盟政策', percent: 85, status: 'mostly' },
  { section: '总部赋能', percent: 80, status: 'mostly' },
  { section: '招商话术库', percent: 60, status: 'partial' },
  { section: '风险与疑虑', percent: 70, status: 'partial' },
  { section: '知识库文档', percent: 90, status: 'complete' },
];

// ---- 财务模型数据 ----
export const FINANCIAL_STORE_MODELS = [
  {
    id: 'standard',
    name: '标准店',
    icon: '🏪',
    color: '#2563eb',
    area: '80-120㎡',
    totalInvest: 65,
    breakdown: [
      { name: '加盟费', amount: 15, percent: 23 },
      { name: '装修费', amount: 18, percent: 28 },
      { name: '设备费', amount: 12, percent: 18 },
      { name: '首批物料', amount: 8, percent: 12 },
      { name: '保证金', amount: 5, percent: 8 },
      { name: '流动资金', amount: 7, percent: 11 },
    ],
    monthly: {
      revenue: 20, cost: 13.5, gross: 6.5,
      rent: 3.5, staff: 5.5, material: 3, utilities: 1.5,
      grossMargin: '67.5%', netMargin: '32.5%',
    },
    roi: { paybackMonths: 18, annualROI: '38%', breakEvenMonthly: 13.5 },
  },
  {
    id: 'flagship',
    name: '旗舰店',
    icon: '🏛️',
    color: '#8b5cf6',
    area: '150-200㎡',
    totalInvest: 120,
    breakdown: [
      { name: '加盟费', amount: 25, percent: 21 },
      { name: '装修费', amount: 35, percent: 29 },
      { name: '设备费', amount: 22, percent: 18 },
      { name: '首批物料', amount: 15, percent: 13 },
      { name: '保证金', amount: 5, percent: 4 },
      { name: '流动资金', amount: 18, percent: 15 },
    ],
    monthly: {
      revenue: 40, cost: 25, gross: 15,
      rent: 7, staff: 10, material: 5, utilities: 3,
      grossMargin: '62.5%', netMargin: '37.5%',
    },
    roi: { paybackMonths: 22, annualROI: '32%', breakEvenMonthly: 25 },
  },
  {
    id: 'community',
    name: '社区店',
    icon: '🏠',
    color: '#14b8a6',
    area: '50-80㎡',
    totalInvest: 35,
    breakdown: [
      { name: '加盟费', amount: 8, percent: 23 },
      { name: '装修费', amount: 10, percent: 29 },
      { name: '设备费', amount: 6, percent: 17 },
      { name: '首批物料', amount: 4, percent: 11 },
      { name: '保证金', amount: 3, percent: 9 },
      { name: '流动资金', amount: 4, percent: 11 },
    ],
    monthly: {
      revenue: 10, cost: 6.5, gross: 3.5,
      rent: 2, staff: 2.5, material: 1.5, utilities: 0.5,
      grossMargin: '65%', netMargin: '35%',
    },
    roi: { paybackMonths: 14, annualROI: '42%', breakEvenMonthly: 6.5 },
  },
];

export const FINANCIAL_CITY_COMPARISON = [
  { tier: '一线城市', cities: '北上广深', rentMultiplier: 1.3, revenueMultiplier: 1.2, payback: '20-24月' },
  { tier: '新一线', cities: '杭州/成都/武汉', rentMultiplier: 1.0, revenueMultiplier: 1.0, payback: '16-20月' },
  { tier: '二线城市', cities: '佛山/东莞/昆明', rentMultiplier: 0.7, revenueMultiplier: 0.85, payback: '14-18月' },
  { tier: '三线城市', cities: '惠州/南宁/遵义', rentMultiplier: 0.5, revenueMultiplier: 0.7, payback: '12-16月' },
];

export const FINANCIAL_SENSITIVITY = [
  { scenario: '乐观', revenueRate: 1.2, costRate: 0.95, paybackMonths: 14, roi: '48%', color: '#07C160' },
  { scenario: '中性', revenueRate: 1.0, costRate: 1.0, paybackMonths: 18, roi: '38%', color: '#2563eb' },
  { scenario: '保守', revenueRate: 0.8, costRate: 1.1, paybackMonths: 26, roi: '22%', color: '#ef4444' },
];

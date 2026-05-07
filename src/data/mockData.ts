import {
  Employee, MonthlyTrend, DeptSpend,
  RateCard, Connector, Exception, CloseStep, PolicyRule
} from './types';

export const employees: Employee[] = [
  { id:1,  name:'Ava Patel',       dept:'Finance',       manager:'Lisa Huang (CFO)',    role:'Director',        eid:'E-1042', fte:1, spend:318.42, tokens:142, gpu:5.2,  prompts:1283, apps:['OpenAI','Copilot'],               policy:'Compliant', variance:18,  alloc:250, center:'FIN-100', risk:52, entity:'US HQ' },
  { id:2,  name:'Marcus Chen',     dept:'Engineering',   manager:'Ray Torres (CTO)',    role:'Staff Engineer',  eid:'E-2190', fte:1, spend:842.13, tokens:460, gpu:18.4, prompts:4870, apps:['OpenAI','Anthropic','Vertex'],      policy:'Review',    variance:41,  alloc:600, center:'ENG-220', risk:77, entity:'US HQ' },
  { id:3,  name:'Sofia Ramirez',   dept:'Revenue Cycle', manager:'Pat Owen (VP Ops)',   role:'Analyst',         eid:'E-1441', fte:1, spend:184.19, tokens:88,  gpu:1.3,  prompts:921,  apps:['Copilot'],                          policy:'Compliant', variance:-6,  alloc:200, center:'RCM-310', risk:19, entity:'US HQ' },
  { id:4,  name:'Daniel Brooks',   dept:'Marketing',     manager:'Rina Park (CMO)',     role:'Manager',         eid:'E-3022', fte:1, spend:509.76, tokens:210, gpu:7.7,  prompts:2128, apps:['OpenAI','Adobe Firefly'],           policy:'Review',    variance:64,  alloc:300, center:'MKT-410', risk:71, entity:'US HQ' },
  { id:5,  name:'Priya Nair',      dept:'HR',            manager:'Tom Bell (CHRO)',     role:'BP Lead',         eid:'E-1880', fte:1, spend:126.31, tokens:61,  gpu:0.8,  prompts:640,  apps:['Copilot'],                          policy:'Compliant', variance:-12, alloc:150, center:'HR-120',  risk:14, entity:'US HQ' },
  { id:6,  name:'Ethan Walker',    dept:'Finance',       manager:'Lisa Huang (CFO)',    role:'FP&A Manager',    eid:'E-1067', fte:1, spend:392.84, tokens:174, gpu:6.1,  prompts:1662, apps:['OpenAI','Copilot'],               policy:'Compliant', variance:22,  alloc:325, center:'FIN-120', risk:35, entity:'US HQ' },
  { id:7,  name:'Jasmine Lee',     dept:'Legal',         manager:'Alan Cross (GC)',     role:'Counsel',         eid:'E-4121', fte:1, spend:267.11, tokens:95,  gpu:2.1,  prompts:552,  apps:['OpenAI'],                           policy:'Escalate',  variance:95,  alloc:175, center:'LGL-610', risk:88, entity:'US HQ' },
  { id:8,  name:'Noah Kim',        dept:'Operations',    manager:'Dana Fox (COO)',      role:'Ops Manager',     eid:'E-5118', fte:1, spend:221.64, tokens:102, gpu:1.8,  prompts:804,  apps:['Copilot','Gemini'],                 policy:'Compliant', variance:5,   alloc:225, center:'OPS-510', risk:23, entity:'US HQ' },
  { id:9,  name:'Chloe Martin',    dept:'Engineering',   manager:'Ray Torres (CTO)',    role:'Senior Engineer', eid:'E-2204', fte:1, spend:714.88, tokens:398, gpu:14.2, prompts:3960, apps:['Anthropic','GitHub Copilot'],       policy:'Review',    variance:29,  alloc:550, center:'ENG-220', risk:61, entity:'US HQ' },
  { id:10, name:'James Wright',    dept:'Finance',       manager:'Lisa Huang (CFO)',    role:'Controller',      eid:'E-1091', fte:1, spend:198.55, tokens:90,  gpu:1.5,  prompts:780,  apps:['Copilot'],                          policy:'Compliant', variance:-3,  alloc:200, center:'FIN-100', risk:22, entity:'US HQ' },
  { id:11, name:'Lily Okonkwo',    dept:'Engineering',   manager:'Ray Torres (CTO)',    role:'ML Engineer',     eid:'E-2299', fte:1, spend:988.40, tokens:520, gpu:22.1, prompts:5120, apps:['Anthropic','Vertex','OpenAI'],      policy:'Review',    variance:52,  alloc:650, center:'ENG-230', risk:80, entity:'US HQ' },
  { id:12, name:'Tom Hartley',     dept:'Operations',    manager:'Dana Fox (COO)',      role:'Process Lead',    eid:'E-5201', fte:1, spend:142.77, tokens:68,  gpu:0.9,  prompts:544,  apps:['Copilot'],                          policy:'Compliant', variance:-8,  alloc:175, center:'OPS-510', risk:16, entity:'US HQ' },
];

export const monthlyTrend: MonthlyTrend[] = [
  { month:'Oct', spend:17200, budget:17000 },
  { month:'Nov', spend:18400, budget:17500 },
  { month:'Dec', spend:19100, budget:17500 },
  { month:'Jan', spend:21400, budget:18500 },
  { month:'Feb', spend:23300, budget:19500 },
  { month:'Mar', spend:25100, budget:20500 },
  { month:'Apr', spend:26780, budget:21500 },
];

export const deptSpend: DeptSpend[] = [
  { name:'Engineering',   spend:9460,  budget:7200, employees:4 },
  { name:'Finance',       spend:5180,  budget:4500, employees:3 },
  { name:'Marketing',     spend:3410,  budget:3000, employees:2 },
  { name:'Revenue Cycle', spend:2700,  budget:2800, employees:1 },
  { name:'Operations',    spend:1980,  budget:2000, employees:2 },
  { name:'Legal',         spend:1870,  budget:1400, employees:1 },
  { name:'HR',            spend:1260,  budget:1400, employees:1 },
];

export const policyMix = [
  { name:'Compliant', value:7 },
  { name:'Review',    value:4 },
  { name:'Escalate',  value:1 },
];

export const ratecards: RateCard[] = [
  { provider:'OpenAI',    model:'GPT-4o',             unit:'per 1M tokens',   cost:5.00,  markup:1.15, effective:'2026-01-01' },
  { provider:'OpenAI',    model:'GPT-4o mini',         unit:'per 1M tokens',   cost:0.60,  markup:1.15, effective:'2026-01-01' },
  { provider:'Anthropic', model:'Claude Sonnet 4',     unit:'per 1M tokens',   cost:3.00,  markup:1.15, effective:'2026-01-01' },
  { provider:'Anthropic', model:'Claude Opus 4',       unit:'per 1M tokens',   cost:15.00, markup:1.15, effective:'2026-01-01' },
  { provider:'Microsoft', model:'Copilot for M365',    unit:'per seat/month',  cost:30.00, markup:1.10, effective:'2026-01-01' },
  { provider:'Google',    model:'Gemini Pro',          unit:'per 1M tokens',   cost:1.25,  markup:1.15, effective:'2026-01-01' },
  { provider:'Google',    model:'Vertex AI (GPU)',     unit:'per GPU-hour',    cost:2.48,  markup:1.20, effective:'2026-01-01' },
  { provider:'Adobe',     model:'Firefly API',         unit:'per 1K renders',  cost:4.00,  markup:1.10, effective:'2026-01-01' },
  { provider:'GitHub',    model:'Copilot Enterprise',  unit:'per seat/month',  cost:39.00, markup:1.10, effective:'2026-01-01' },
];

export const connectors: Connector[] = [
  { name:'OpenAI API',          status:'Connected', type:'Usage + Billing',   color:'#22c55e' },
  { name:'Anthropic API',       status:'Connected', type:'Usage + Billing',   color:'#22c55e' },
  { name:'Microsoft Copilot',   status:'Connected', type:'Seat + Activity',   color:'#22c55e' },
  { name:'Google Vertex',       status:'Degraded',  type:'Usage + Billing',   color:'#f59e0b' },
  { name:'Workday HRIS',        status:'Connected', type:'Identity + Org',    color:'#22c55e' },
  { name:'AWS Bedrock',         status:'Pending',   type:'Usage + Billing',   color:'#64748b' },
  { name:'GitHub (Copilot)',    status:'Connected', type:'Seat + Activity',   color:'#22c55e' },
  { name:'Adobe Firefly API',   status:'Degraded',  type:'Usage + Billing',   color:'#f59e0b' },
];

export const exceptions: Exception[] = [
  { id:1, level:'Escalate', emp:'Jasmine Lee',    dept:'Legal',       issue:'Spend 95% above allocation — no business justification filed. CFO review required before month lock.', center:'LGL-610' },
  { id:2, level:'Review',   emp:'Daniel Brooks',  dept:'Marketing',   issue:'Adobe Firefly is not on the approved vendor list for cost center MKT-410. Manager must confirm or remove.', center:'MKT-410' },
  { id:3, level:'Review',   emp:'Marcus Chen',    dept:'Engineering', issue:'Token usage spike of 3.1× month-over-month across three AI providers. Review for policy compliance.', center:'ENG-220' },
  { id:4, level:'Review',   emp:'Chloe Martin',   dept:'Engineering', issue:'GitHub Copilot Enterprise seat active — manager approval not recorded in the system.', center:'ENG-220' },
  { id:5, level:'Review',   emp:'Lily Okonkwo',   dept:'Engineering', issue:'Highest per-employee spend this month ($988). Usage spans 3 providers. Justification doc missing.', center:'ENG-230' },
];

export const closeSteps: CloseStep[] = [
  { label:'Ingest sources',      done:true  },
  { label:'Normalize usage',     done:true  },
  { label:'Match identities',    done:true  },
  { label:'Apply rate cards',    done:true  },
  { label:'Policy checks',       done:false, active:true },
  { label:'Review exceptions',   done:false },
  { label:'Approve overrides',   done:false },
  { label:'Lock month',          done:false },
];

export const defaultPolicyRules: PolicyRule[] = [
  { key:'overspend',   label:'Over-budget alert',       desc:'Flag employees who exceed their monthly allocation by more than the configured threshold.', threshold:'20%',    enabled:true  },
  { key:'shadow',      label:'Shadow AI detection',     desc:'Alert when usage is detected from a tool not on the approved vendor list for that cost center.', threshold:'any',    enabled:true  },
  { key:'spike',       label:'Usage spike detection',   desc:'Flag employees whose token or prompt usage increases more than 2× month-over-month.', threshold:'2× MoM', enabled:true  },
  { key:'orphan',      label:'Orphaned usage',          desc:'Identify usage events that cannot be matched to an active employee record in Workday.', threshold:'any',    enabled:false },
  { key:'justify',     label:'Justification required',  desc:'Require business justification filing for spend above a high-spend threshold.', threshold:'$500/mo', enabled:true  },
  { key:'inactive',    label:'Inactive seat detection', desc:'Flag paid AI seats where the employee has had zero usage for 30+ days.', threshold:'30 days', enabled:true  },
];

export const financeOutputs = [
  { name:'Showback report',         type:'PDF + CSV',          status:'Ready'        },
  { name:'Chargeback journal',       type:'ERP import file',    status:'Pending lock' },
  { name:'Department packs',         type:'Per-manager PDF',    status:'Ready'        },
  { name:'Executive summary',        type:'Board slide deck',   status:'Pending lock' },
  { name:'Audit ledger snapshot',    type:'Immutable JSON',     status:'Pending lock' },
  { name:'Accrual estimate',         type:'Finance model',      status:'Ready'        },
];

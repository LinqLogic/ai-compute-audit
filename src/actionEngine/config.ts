/**
 * ACTION_ENGINE_CONFIG
 *
 * Single source of truth for all thresholds and assumptions used by the
 * Action Engine detectors. Centralised here so changes propagate everywhere
 * without hunting for magic numbers across detector files.
 *
 * All monetary values are USD/month unless otherwise noted.
 * All fractions are 0–1 (not percentages).
 */
export const ACTION_ENGINE_CONFIG = {

  spendSpike: {
    // Thresholds applied to (spend − allocation) / allocation
    // Raised from 0.25/0.75/1.50 → only flag meaningfully material deviations
    allocationVarianceMedium:   0.50,   // 50% above allocation
    allocationVarianceHigh:     1.50,   // 150% above allocation
    allocationVarianceCritical: 3.00,   // 300% above allocation

    // Thresholds applied to (spend − peer_median) / peer_median
    // Raised from 0.35/0.75/1.50 → peer comparison is noisier, needs higher bar
    peerMedianDevMedium:   0.75,        // 75% above dept peer median
    peerMedianDevHigh:     1.50,        // 150% above dept peer median
    peerMedianDevCritical: 3.00,        // 300% above dept peer median

    // Minimum peer group size for peer-median comparison to be meaningful
    minPeerGroupSize: 3,

    // Materiality floors — suppress items below these dollar amounts
    minimumAnnualSavings:    2_400,     // $2,400/yr minimum (~$200/month)
    minimumOvreageMonthly:   100,       // $100/month minimum overage

    // Conservative fraction of overage assumed recoverable
    savingsRecoveryRate: 0.80,          // 80%

    annualizationMonths: 12,
  },

  idleSeat: {
    // Below this prompt count/month → considered underutilized for a seat tool
    lowUsagePromptThreshold: 1_000,

    // Monthly seat licence costs by app name.
    // Matching is case-insensitive — add canonical names and common variants.
    seatCostByApp: {
      'copilot':                         30,
      'microsoft copilot':               30,
      'copilot for m365':                30,
      'm365 copilot':                    30,
      'microsoft 365 copilot':           30,
      'github copilot':                  19,
      'github copilot enterprise':       39,
      'github copilot business':         19,
      'cursor':                          20,
      'cursor pro':                      40,
      'tabnine':                         15,
      'tabnine enterprise':              39,
      'codewhisperer':                   19,
      'amazon codewhisperer':            19,
    } as Record<string, number>,

    // Only flag an item if estimated monthly waste exceeds this floor
    minimumWasteMonthly: 5,            // $5/month

    annualizationMonths: 12,
  },

  modelOptimization: {
    // Conservative fraction of qualifying spend that could shift to cheaper tiers
    conservativeSavingsRate: 0.25,      // 25% (deliberately understated)

    // Monthly spend thresholds for severity classification
    mediumSpendThreshold:   200,        // $200/month
    highSpendThreshold:     500,        // $500/month
    criticalSpendThreshold: 800,        // $800/month

    annualizationMonths: 12,
  },

  budgetOverrun: {
    // Thresholds applied to (spend − budget) / budget
    mediumThreshold:   0.10,            // 10%
    highThreshold:     0.25,            // 25%
    criticalThreshold: 0.50,            // 50%

    // Conservative fraction of overage assumed correctable
    savingsRecoveryRate: 0.85,          // 85%

    annualizationMonths: 12,
  },

  priorityScoring: {
    maxScore: 1_000,

    // Contribution weights — must sum to 1.0
    weights: {
      financial:  0.40,
      severity:   0.25,
      confidence: 0.15,
      governance: 0.20,
    },

    // Annual savings cap for financial score normalisation ($50K → max fin score)
    annualImpactCap: 50_000,

    severityScores: {
      critical: 100,
      high:     75,
      medium:   50,
      low:      25,
    } as Record<string, number>,
  },

  confidence: {
    fromRawEvents:   90,   // Raw usage_events.csv imported — highest fidelity
    fromAggregated:  70,   // Aggregated Employee domain objects
    fromInferred:    50,   // Synthesized or spend-only inference
  },

  export: {
    // Default cap for executive-level CSV export
    maxExecutiveItems: 25,
  },

} as const;

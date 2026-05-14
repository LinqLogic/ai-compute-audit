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
    // Thresholds applied to (spend - allocation) / allocation
    allocationVarianceMedium:   0.25,   // 25%
    allocationVarianceHigh:     0.75,   // 75%
    allocationVarianceCritical: 1.50,   // 150%

    // Thresholds applied to (spend - peer_median) / peer_median
    peerMedianDevMedium:   0.35,        // 35%
    peerMedianDevHigh:     0.75,        // 75%
    peerMedianDevCritical: 1.50,        // 150%

    // Minimum peer group size for peer-median comparison to be meaningful
    minPeerGroupSize: 3,

    // Conservative fraction of overage assumed recoverable
    savingsRecoveryRate: 0.80,          // 80%

    annualizationMonths: 12,
  },

  idleSeat: {
    // Below this prompt count/month → considered underutilized for a seat tool
    lowUsagePromptThreshold: 1_000,

    // Monthly seat licence costs by app name (must match Employee.apps values exactly)
    seatCostByApp: {
      'Copilot':                   30,
      'Microsoft Copilot':         30,
      'Copilot for M365':          30,
      'GitHub Copilot':            39,
      'GitHub Copilot Enterprise': 39,
    } as Record<string, number>,

    // Only flag an item if estimated monthly waste exceeds this floor
    minimumWasteMonthly: 5,            // $5/month

    annualizationMonths: 12,
  },

  modelOptimization: {
    // Conservative fraction of qualifying spend that could shift to cheaper models
    conservativeSavingsRate: 0.30,      // 30%

    // Monthly spend thresholds for severity classification
    mediumSpendThreshold:   200,        // $200/month
    highSpendThreshold:     500,        // $500/month
    criticalSpendThreshold: 800,        // $800/month

    // Employee must use at least this many providers to qualify
    // (multi-provider usage suggests premium + cheaper mix opportunity)
    multiProviderCount: 2,

    annualizationMonths: 12,
  },

  budgetOverrun: {
    // Thresholds applied to (spend - budget) / budget
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
    fromRawEvents:   90,   // Raw usage_events.csv imported
    fromAggregated:  70,   // Aggregated Employee domain objects
    fromInferred:    50,   // Synthesized / estimated
  },

} as const;

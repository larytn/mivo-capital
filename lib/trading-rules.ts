export const TRADING_RULES = {
  THREE_STEP: {
    PHASE_1: {
      profitTarget: 5,

      dailyDrawdown: 5,
      dailyDrawdownType: "STATIC",

      maxDrawdown: 10,
      maxDrawdownType: "STATIC",

      minimumTradingDays: 3,
      consistencyRule: null,
    },

    PHASE_2: {
      profitTarget: 5,

      dailyDrawdown: 5,
      dailyDrawdownType: "STATIC",

      maxDrawdown: 10,
      maxDrawdownType: "STATIC",

      minimumTradingDays: 3,
      consistencyRule: null,
    },

    PHASE_3: {
      profitTarget: 5,

      dailyDrawdown: 5,
      dailyDrawdownType: "STATIC",

      maxDrawdown: 10,
      maxDrawdownType: "STATIC",

      minimumTradingDays: 3,
      consistencyRule: null,
    },

    FUNDED: {
      profitTarget: null,

      dailyDrawdown: 5,
      dailyDrawdownType: "STATIC",

      maxDrawdown: 10,
      maxDrawdownType: "STATIC",

      minimumTradingDays: 3,
      consistencyRule: null,

      withdrawalDays: 14,
      profitSplit: 85,
    },
  },

  ONE_STEP: {
    PHASE_1: {
      profitTarget: 10,

      dailyDrawdown: 3,
      dailyDrawdownType: "STATIC",

      maxDrawdown: 10,
      maxDrawdownType: "TRAILING",

      minimumTradingDays: 5,
      consistencyRule: 50,
    },

    FUNDED: {
      profitTarget: null,

      dailyDrawdown: 3,
      dailyDrawdownType: "STATIC",

      maxDrawdown: 10,
      maxDrawdownType: "TRAILING",

      minimumTradingDays: 5,
      consistencyRule: 50,

      withdrawalDays: 14,
      profitSplit: 80,
    },
  },

  TWO_STEP: {
    PHASE_1: {
      profitTarget: 10,

      dailyDrawdown: 5,
      dailyDrawdownType: "STATIC",

      maxDrawdown: 10,
      maxDrawdownType: "STATIC",

      minimumTradingDays: 3,
      consistencyRule: null,
    },

    PHASE_2: {
      profitTarget: 5,

      dailyDrawdown: 5,
      dailyDrawdownType: "STATIC",

      maxDrawdown: 10,
      maxDrawdownType: "STATIC",

      minimumTradingDays: 3,
      consistencyRule: null,
    },

    FUNDED: {
      profitTarget: null,

      dailyDrawdown: 5,
      dailyDrawdownType: "STATIC",

      maxDrawdown: 10,
      maxDrawdownType: "STATIC",

      minimumTradingDays: 3,
      consistencyRule: null,

      withdrawalDays: 14,
      profitSplit: 80,
    },
  },

  INSTANT: {
    FUNDED: {
      profitTarget: null,

      dailyDrawdown: 3,
      dailyDrawdownType: "STATIC",

      maxDrawdown: 5,
      maxDrawdownType: "TRAILING",

      minimumTradingDays: 5,
      consistencyRule: 15,

      withdrawalDays: 14,
      profitSplit: 80,
    },
  },
} as const;
export type MonthlyLimit = {
  categoryId: number;
  categoryName: string;
  month: string;
  limitAmount: number;
  spentAmount: number;
};

export type LimitWarning = MonthlyLimit & {
  usagePercent: number;
  level: 'NEAR_LIMIT' | 'EXCEEDED';
};

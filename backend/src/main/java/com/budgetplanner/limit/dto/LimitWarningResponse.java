package com.budgetplanner.limit.dto;

import java.math.BigDecimal;
import java.time.YearMonth;

public record LimitWarningResponse(
        Long categoryId,
        String categoryName,
        YearMonth month,
        BigDecimal limitAmount,
        BigDecimal spentAmount,
        BigDecimal usagePercent,
        LimitWarningLevel level
) {}

package com.budgetplanner.limit.dto;

import java.math.BigDecimal;
import java.time.YearMonth;

public record MonthlyLimitResponse(
        Long categoryId,
        String categoryName,
        YearMonth month,
        BigDecimal limitAmount,
        BigDecimal spentAmount
) {}

package com.budgetplanner.dashboard.dto;

import com.budgetplanner.limit.dto.LimitWarningResponse;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record DashboardResponse(
        LocalDate dateFrom,
        LocalDate dateTo,
        DashboardGroupBy groupBy,
        BigDecimal openingBalance,
        BigDecimal balance,
        BigDecimal reservedForGoals,
        BigDecimal availableBalance,
        BigDecimal income,
        BigDecimal expenses,
        List<CategoryExpenseResponse> expensesByCategory,
        List<DashboardTrendPoint> trend,
        List<LimitWarningResponse> limitWarnings
) {}

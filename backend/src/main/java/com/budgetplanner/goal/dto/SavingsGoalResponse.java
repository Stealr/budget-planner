package com.budgetplanner.goal.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record SavingsGoalResponse(
        Long id,
        String name,
        BigDecimal targetAmount,
        LocalDate dueDate,
        BigDecimal savedAmount,
        BigDecimal progressPercent,
        boolean completed
) {}

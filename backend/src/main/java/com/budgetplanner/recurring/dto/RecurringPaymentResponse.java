package com.budgetplanner.recurring.dto;

import java.math.BigDecimal;

public record RecurringPaymentResponse(
        Long id,
        String name,
        BigDecimal amount,
        Long categoryId,
        String categoryName,
        int dayOfMonth,
        boolean remindersEnabled
) {}

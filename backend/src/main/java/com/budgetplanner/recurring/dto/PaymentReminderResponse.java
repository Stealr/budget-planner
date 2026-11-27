package com.budgetplanner.recurring.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record PaymentReminderResponse(
        Long paymentId,
        String name,
        BigDecimal amount,
        Long categoryId,
        String categoryName,
        LocalDate dueDate
) {}

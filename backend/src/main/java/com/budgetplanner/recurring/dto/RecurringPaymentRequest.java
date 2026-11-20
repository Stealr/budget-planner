package com.budgetplanner.recurring.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record RecurringPaymentRequest(
        @NotBlank @Size(max = 120) String name,
        @NotNull @DecimalMin("0.01") @Digits(integer = 17, fraction = 2) BigDecimal amount,
        @NotNull Long categoryId,
        @NotNull @Min(1) @Max(31) Integer dayOfMonth,
        @NotNull Boolean remindersEnabled
) {}

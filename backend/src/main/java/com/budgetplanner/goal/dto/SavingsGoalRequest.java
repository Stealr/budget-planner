package com.budgetplanner.goal.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record SavingsGoalRequest(
        @NotBlank @Size(max = 120) String name,
        @NotNull @DecimalMin("0.01") @Digits(integer = 17, fraction = 2) BigDecimal targetAmount,
        @NotNull LocalDate dueDate
) {}

package com.budgetplanner.transaction.dto;

import com.budgetplanner.category.entity.CategoryType;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;

public record TransactionRequest(
		@NotNull
		@DecimalMin("0.01")
		@Digits(integer = 17,fraction = 2)
		BigDecimal amount,

		@NotNull
		CategoryType type,

		@NotNull
		Long categoryId,

		@Size(max = 500)
		String description,

		@NotNull
		LocalDate transactionDate
) {}

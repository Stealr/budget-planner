package com.budgetplanner.transaction.dto;

import com.budgetplanner.category.entity.CategoryType;
import com.budgetplanner.limit.dto.LimitWarningResponse;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.math.BigDecimal;
import java.time.*;

public record TransactionResponse(
		Long id,
		BigDecimal amount,
		CategoryType type,
		Long categoryId,
		String description,
		LocalDate transactionDate,
		Instant createdAt,
		String categoryName,
		@JsonInclude(JsonInclude.Include.NON_NULL) LimitWarningResponse limitWarning
) {}

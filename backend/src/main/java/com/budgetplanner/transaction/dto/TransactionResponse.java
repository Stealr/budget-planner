package com.budgetplanner.transaction.dto;

import com.budgetplanner.category.entity.CategoryType;
import java.math.BigDecimal;
import java.time.*;

public record TransactionResponse(
		Long id,
		BigDecimal amount,
		CategoryType type,
		Long categoryId,
		String description,
		LocalDate transactionDate,
		Instant createdAt
) {}

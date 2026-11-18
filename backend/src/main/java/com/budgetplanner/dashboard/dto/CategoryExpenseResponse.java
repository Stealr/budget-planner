package com.budgetplanner.dashboard.dto;

import java.math.BigDecimal;

public record CategoryExpenseResponse(Long categoryId, String categoryName, BigDecimal amount) {}

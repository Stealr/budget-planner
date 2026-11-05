package com.budgetplanner.category.dto;

import com.budgetplanner.category.entity.CategoryType;
import java.time.Instant;

public record CategoryResponse(
        Long id,
        String name,
        CategoryType type,
        Instant createdAt
) {}

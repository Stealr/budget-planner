package com.budgetplanner.category.dto;

import com.budgetplanner.category.entity.CategoryType;
import jakarta.validation.constraints.*;

public record CategoryRequest(
        @NotBlank @Size(max = 100) String name,
        @NotNull CategoryType type
) {}

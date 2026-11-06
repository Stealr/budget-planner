package com.budgetplanner.category.mapper;

import com.budgetplanner.category.dto.*;
import com.budgetplanner.category.entity.Category;
import org.springframework.stereotype.Component;

@Component
public class CategoryMapper {
	public CategoryResponse toResponse(Category category) {
		return new CategoryResponse(
				category.getId(),
				category.getName(),
				category.getType(),
				category.getCreatedAt()
		);
	}

	public void update(Category category,CategoryRequest request) {
		category.setName(request.name().trim());
		category.setType(request.type());
	}
}

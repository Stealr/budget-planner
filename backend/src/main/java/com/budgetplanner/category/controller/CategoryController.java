package com.budgetplanner.category.controller;

import com.budgetplanner.category.dto.*;
import com.budgetplanner.category.service.CategoryService;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import com.budgetplanner.auth.security.CurrentUserId;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@Tag(name = "Categories", description = "CRUD for income and expense categories")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/categories")
public class CategoryController {

	private final CategoryService categoryService;

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public CategoryResponse create(@CurrentUserId Long ownerId, @Valid @RequestBody CategoryRequest request) {return categoryService.create(ownerId, request);}

	@GetMapping
	public List<CategoryResponse> list(@CurrentUserId Long ownerId) {
		return categoryService.list(ownerId);
	}

	@GetMapping("/{id}")
	public CategoryResponse get(@CurrentUserId Long ownerId, @PathVariable Long id) {
		return categoryService.get(ownerId, id);
	}

	@PutMapping("/{id}")
	public CategoryResponse update(@CurrentUserId Long ownerId, @PathVariable Long id,@Valid @RequestBody CategoryRequest request) {
		return categoryService.update(ownerId, id, request);
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void delete(@CurrentUserId Long ownerId, @PathVariable Long id) {
		categoryService.delete(ownerId, id);
	}
}

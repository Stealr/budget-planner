package com.budgetplanner.category.controller;

import com.budgetplanner.category.dto.*;
import com.budgetplanner.category.service.CategoryService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@Tag(name = "Categories", description = "CRUD for income and expense categories")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/categories")
public class CategoryController {

	private final CategoryService categoryService;

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public CategoryResponse create(@Valid @RequestBody CategoryRequest r) {return categoryService.create(r);}

	@GetMapping
	public List<CategoryResponse> list() {
		return categoryService.list();
	}

	@GetMapping("/{id}")
	public CategoryResponse get(@PathVariable Long id) {
		return categoryService.get(id);
	}

	@PutMapping("/{id}")
	public CategoryResponse update(@PathVariable Long id,@Valid @RequestBody CategoryRequest request) {
		return categoryService.update(id, request);
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void delete(@PathVariable Long id) {
		categoryService.delete(id);
	}
}

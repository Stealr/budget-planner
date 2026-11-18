package com.budgetplanner.category.controller;

import com.budgetplanner.auth.security.CurrentUserId;
import com.budgetplanner.category.dto.CategoryRequest;
import com.budgetplanner.category.dto.CategoryResponse;
import com.budgetplanner.category.service.CategoryService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Categories", description = "Standard catalog and custom categories")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/categories")
public class CategoryController {
    private final CategoryService categoryService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CategoryResponse create(@CurrentUserId Long ownerId, @Valid @RequestBody CategoryRequest request) {
        return categoryService.create(ownerId, request);
    }

    @GetMapping
    public List<CategoryResponse> list(@CurrentUserId Long ownerId,
                                       @RequestParam(defaultValue = "false") boolean includeArchived) {
        return categoryService.list(ownerId, includeArchived);
    }

    @GetMapping("/{id}")
    public CategoryResponse get(@CurrentUserId Long ownerId, @PathVariable Long id) {
        return categoryService.get(ownerId, id);
    }

    @PutMapping("/{id}")
    public CategoryResponse update(@CurrentUserId Long ownerId, @PathVariable Long id,
                                   @Valid @RequestBody CategoryRequest request) {
        return categoryService.update(ownerId, id, request);
    }

    @PatchMapping("/{id}/archive")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void archive(@CurrentUserId Long ownerId, @PathVariable Long id) {
        categoryService.archive(ownerId, id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@CurrentUserId Long ownerId, @PathVariable Long id) {
        categoryService.delete(ownerId, id);
    }
}

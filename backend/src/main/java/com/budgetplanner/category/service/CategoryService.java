package com.budgetplanner.category.service;

import com.budgetplanner.category.dto.CategoryRequest;
import com.budgetplanner.category.dto.CategoryResponse;
import com.budgetplanner.category.entity.Category;
import com.budgetplanner.category.mapper.CategoryMapper;
import com.budgetplanner.category.repository.CategoryRepository;
import com.budgetplanner.common.exception.BusinessConflictException;
import com.budgetplanner.common.exception.ResourceNotFoundException;
import com.budgetplanner.limit.repository.MonthlyLimitRepository;
import com.budgetplanner.transaction.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoryService {
    private final CategoryMapper categoryMapper;
    private final CategoryRepository categoryRepository;
    private final TransactionRepository transactionRepository;
    private final MonthlyLimitRepository monthlyLimits;

    @Transactional
    public CategoryResponse create(Long ownerId, CategoryRequest request) {
        Category category = new Category();
        category.setOwnerId(ownerId);
        categoryMapper.update(category, request);
        return categoryMapper.toResponse(categoryRepository.save(category));
    }

    @Transactional(readOnly = true)
    public List<CategoryResponse> list(Long ownerId, boolean includeArchived) {
        return categoryRepository.findVisible(ownerId, includeArchived).stream()
                .map(categoryMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public CategoryResponse get(Long ownerId, Long id) {
        return categoryMapper.toResponse(categoryRepository.findVisibleById(ownerId, id)
                .orElseThrow(() -> categoryNotFound(id)));
    }

    @Transactional
    public CategoryResponse update(Long ownerId, Long id, CategoryRequest request) {
        Category category = findCustomCategoryForUpdate(ownerId, id);
        if (category.getType() != request.type()) {
            if (transactionRepository.existsByCategoryId(id)) {
                throw new BusinessConflictException("Cannot change type of a category with transactions");
            }
            if (monthlyLimits.existsByCategoryId(id)) {
                throw new BusinessConflictException("Cannot change type of a category with monthly limits");
            }
        }

        categoryMapper.update(category, request);
        return categoryMapper.toResponse(category);
    }

    @Transactional
    public void archive(Long ownerId, Long id) {
        findCustomCategoryForUpdate(ownerId, id).archive(Instant.now());
    }

    @Transactional
    public void delete(Long ownerId, Long id) {
        Category category = findCustomCategoryForUpdate(ownerId, id);
        if (transactionRepository.existsByCategoryId(id)) {
            throw new BusinessConflictException("Category is used by transactions and can only be archived");
        }
        if (monthlyLimits.existsByCategoryId(id)) {
            throw new BusinessConflictException("Category is used by monthly limits and can only be archived");
        }
        categoryRepository.delete(category);
    }

    private Category findCustomCategoryForUpdate(Long ownerId, Long id) {
        Category category = categoryRepository.findVisibleForUpdate(ownerId, id).orElseThrow(() -> categoryNotFound(id));
        if (category.isStandard()) {
            throw new BusinessConflictException("Standard categories cannot be changed");
        }
        return category;
    }

    private static ResourceNotFoundException categoryNotFound(Long id) {
        return new ResourceNotFoundException("Category not found: " + id);
    }
}

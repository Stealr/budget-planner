package com.budgetplanner.category.service;

import com.budgetplanner.category.dto.*;
import com.budgetplanner.category.entity.Category;
import com.budgetplanner.category.mapper.CategoryMapper;
import com.budgetplanner.category.repository.CategoryRepository;
import com.budgetplanner.transaction.repository.TransactionRepository;
import com.budgetplanner.common.exception.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoryService {
	private final CategoryMapper categoryMapper;
	private final CategoryRepository categoryRepository;
	private final TransactionRepository transactionRepository;

	@Transactional
	public CategoryResponse create(CategoryRequest request) {
		Category category = new Category();
		categoryMapper.update(category, request);
		return categoryMapper.toResponse(categoryRepository.save(category));
	}

	@Transactional(readOnly=true)
	public List<CategoryResponse> list() {
		return categoryRepository.findAll()
				.stream()
				.map(categoryMapper::toResponse)
				.toList();
	}

	@Transactional(readOnly=true)
	public CategoryResponse get(Long id) {
		return categoryMapper.toResponse(findCategory(id));
	}

	@Transactional
	public CategoryResponse update(Long id,CategoryRequest request) {
		Category category = findCategory(id);

		if (transactionRepository.existsByCategoryId(id) && category.getType() != request.type()) {
			throw new BusinessConflictException("Cannot change type of a category with transactions");
		}

		categoryMapper.update(category, request);
		return categoryMapper.toResponse(category);
	}

	@Transactional
	public void delete(Long id) {
		Category category = findCategory(id);

		if (transactionRepository.existsByCategoryId(id)) {
			throw new BusinessConflictException("Category is used by transactions");
		}

		categoryRepository.delete(category);
		categoryRepository.flush();
	}

	private Category findCategory(Long id) {
		return categoryRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Category not found: " +  id));
	}
}

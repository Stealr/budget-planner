package com.budgetplanner.transaction.service;

import com.budgetplanner.category.entity.Category;
import com.budgetplanner.category.entity.CategoryType;
import com.budgetplanner.category.repository.CategoryRepository;
import com.budgetplanner.common.exception.*;
import com.budgetplanner.transaction.dto.*;
import com.budgetplanner.transaction.entity.Transaction;
import com.budgetplanner.transaction.mapper.TransactionMapper;
import com.budgetplanner.transaction.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class TransactionService {
	private final TransactionRepository transactionRepository;
	private final CategoryRepository categoryRepository;
	private final TransactionMapper transactionMapper;

	@Transactional
	public TransactionResponse create(Long ownerId, TransactionRequest request) {
		Category category = validatedCategory(ownerId, request);
		Transaction transaction = new Transaction();

		transactionMapper.update(transaction, request, category);
		return transactionMapper.toResponse(transactionRepository.save(transaction));
	}

	@Transactional(readOnly = true)
	public TransactionResponse get(Long ownerId, Long id) {
		return transactionMapper.toResponse(find(ownerId, id));
	}

	@Transactional(readOnly = true)
	public Page<TransactionResponse> list(Long ownerId, CategoryType type, Long categoryId, LocalDate from, LocalDate to, Pageable pageable) {
		if (from != null && to != null && from.isAfter(to)) {
			throw new IllegalArgumentException("dateFrom must not be after dateTo");
		}

		return transactionRepository.findFiltered(ownerId, type, categoryId, from, to, pageable).map(transactionMapper::toResponse);
	}

	@Transactional
	public TransactionResponse update(Long ownerId, Long id, TransactionRequest request) {
		Transaction transaction = find(ownerId, id);
		Category category = validatedCategory(ownerId, request);

		transactionMapper.update(transaction, request, category);

		return transactionMapper.toResponse(transaction);
	}

	@Transactional
	public void delete(Long ownerId, Long id) {
		Transaction transaction = find(ownerId, id);
		transactionRepository.delete(transaction);
	}

	private Transaction find(Long ownerId, Long id) {
		return transactionRepository.findByIdAndCategoryOwnerId(id, ownerId)
				.orElseThrow(() -> new ResourceNotFoundException("Transaction not found: " + id));
	}

	private Category validatedCategory(Long ownerId, TransactionRequest request) {
		if (request.amount() == null || request.amount().signum() <= 0 ||
				request.amount().scale() > 2 || request.amount().precision() - request.amount().scale() > 17) {
			throw new IllegalArgumentException("Invalid transaction amount");
		}

		Category category = categoryRepository.findByIdAndOwnerId(request.categoryId(), ownerId)
				.orElseThrow(() -> new ResourceNotFoundException("Category not found: " + request.categoryId()));

		if(category.getType() != request.type()) {
			throw new BusinessConflictException("Category type does not match transaction type");
		}

		return category;
	}
}

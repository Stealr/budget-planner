package com.budgetplanner.transaction.service;

import com.budgetplanner.category.entity.Category;
import com.budgetplanner.category.entity.CategoryType;
import com.budgetplanner.category.repository.CategoryRepository;
import com.budgetplanner.common.exception.BusinessConflictException;
import com.budgetplanner.common.exception.ResourceNotFoundException;
import com.budgetplanner.limit.service.LimitWarningService;
import com.budgetplanner.transaction.dto.TransactionRequest;
import com.budgetplanner.transaction.dto.TransactionResponse;
import com.budgetplanner.transaction.entity.Transaction;
import com.budgetplanner.transaction.mapper.TransactionMapper;
import com.budgetplanner.transaction.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class TransactionService {
    private final TransactionRepository transactionRepository;
    private final CategoryRepository categoryRepository;
    private final TransactionMapper transactionMapper;
    private final LimitWarningService limitWarnings;

    @Transactional
    public TransactionResponse create(Long ownerId, TransactionRequest request) {
        Category category = validatedCategory(ownerId, request, null);
        Transaction transaction = new Transaction();
        transaction.setOwnerId(ownerId);

        transactionMapper.update(transaction, request, category);
        Transaction saved = transactionRepository.save(transaction);
        if (saved.getType() != CategoryType.EXPENSE) {
            return transactionMapper.toResponse(saved);
        }
        var warning = limitWarnings.afterExpense(ownerId, category.getId(), saved.getTransactionDate());
        return transactionMapper.toResponse(saved, warning.orElse(null));
    }

    @Transactional(readOnly = true)
    public TransactionResponse get(Long ownerId, Long id) {
        return transactionMapper.toResponse(transactionRepository.findByIdAndOwnerId(id, ownerId)
                .orElseThrow(() -> transactionNotFound(id)));
    }

    @Transactional(readOnly = true)
    public Page<TransactionResponse> list(Long ownerId, CategoryType type, Long categoryId,
                                          LocalDate from, LocalDate to, Pageable pageable) {
        if (from != null && to != null && from.isAfter(to)) {
            throw new IllegalArgumentException("dateFrom must not be after dateTo");
        }

        return transactionRepository.findFiltered(ownerId, type, categoryId, from, to, pageable)
                .map(transactionMapper::toResponse);
    }

    @Transactional
    public TransactionResponse update(Long ownerId, Long id, TransactionRequest request) {
        Transaction transaction = transactionRepository.findForUpdate(id, ownerId)
                .orElseThrow(() -> transactionNotFound(id));
        Category category = validatedCategory(ownerId, request, transaction.getCategory().getId());
        transactionMapper.update(transaction, request, category);
        return transactionMapper.toResponse(transaction);
    }

    @Transactional
    public void delete(Long ownerId, Long id) {
        Transaction transaction = transactionRepository.findForUpdate(id, ownerId)
                .orElseThrow(() -> transactionNotFound(id));
        transactionRepository.delete(transaction);
    }

    private static ResourceNotFoundException transactionNotFound(Long id) {
        return new ResourceNotFoundException("Transaction not found: " + id);
    }

    private Category validatedCategory(Long ownerId, TransactionRequest request, Long currentCategoryId) {
        if (request.amount() == null || request.amount().signum() <= 0
                || request.amount().scale() > 2 || request.amount().precision() - request.amount().scale() > 17) {
            throw new IllegalArgumentException("Invalid transaction amount");
        }

        Category category = categoryRepository.findVisibleForAssignment(ownerId, request.categoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + request.categoryId()));

        if (category.getArchivedAt() != null && !category.getId().equals(currentCategoryId)) {
            throw new BusinessConflictException("Cannot assign an archived category");
        }
        if (category.getType() != request.type()) {
            throw new BusinessConflictException("Category type does not match transaction type");
        }

        return category;
    }
}

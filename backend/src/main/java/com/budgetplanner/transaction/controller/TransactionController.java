package com.budgetplanner.transaction.controller;

import com.budgetplanner.category.entity.CategoryType;
import com.budgetplanner.transaction.dto.*;
import com.budgetplanner.transaction.service.TransactionService;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import com.budgetplanner.auth.security.CurrentUserId;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;

@Tag(name = "Transactions", description = "CRUD and filtering for financial transactions")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/transactions")
public class TransactionController {
	private final TransactionService transactionService;

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public TransactionResponse create(@CurrentUserId Long ownerId, @Valid @RequestBody TransactionRequest request) {
		return transactionService.create(ownerId, request);
	}

	@GetMapping("/{id}")
	public TransactionResponse get(@CurrentUserId Long ownerId, @PathVariable Long id) {
		return transactionService.get(ownerId, id);
	}

	@GetMapping
	public Page<TransactionResponse> list(
			@CurrentUserId Long ownerId,
			@RequestParam(required = false) CategoryType type,
			@RequestParam(required = false) Long categoryId,
			@RequestParam(required = false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate dateFrom,
			@RequestParam(required = false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate dateTo,
			@PageableDefault(size = 20, sort = "transactionDate", direction = Sort.Direction.DESC) Pageable pageable) {

		return transactionService.list(ownerId, type, categoryId, dateFrom, dateTo, pageable);
    }

    @PutMapping("/{id}")
    public TransactionResponse update(@CurrentUserId Long ownerId, @PathVariable Long id, @Valid @RequestBody TransactionRequest request) {
		return transactionService.update(ownerId, id, request);
	}

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@CurrentUserId Long ownerId, @PathVariable Long id) {
		transactionService.delete(ownerId, id);
	}
}

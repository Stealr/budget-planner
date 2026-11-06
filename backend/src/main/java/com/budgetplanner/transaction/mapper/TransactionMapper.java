package com.budgetplanner.transaction.mapper;

import com.budgetplanner.transaction.dto.*;
import com.budgetplanner.transaction.entity.Transaction;
import com.budgetplanner.category.entity.Category;
import org.springframework.stereotype.Component;

@Component
public class TransactionMapper {
	public TransactionResponse toResponse(Transaction transaction) {
		return new TransactionResponse(
				transaction.getId(),
				transaction.getAmount(),
				transaction.getType(),
				transaction.getCategory().getId(),
				transaction.getDescription(),
				transaction.getTransactionDate(),
				transaction.getCreatedAt()
		);
	}

	public void update(Transaction transaction, TransactionRequest request, Category category) {
		transaction.setAmount(request.amount());
		transaction.setType(request.type());
		transaction.setCategory(category);
		transaction.setDescription(request.description());
		transaction.setTransactionDate(request.transactionDate());
	}
}

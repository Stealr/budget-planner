package com.budgetplanner.transaction.repository;

import com.budgetplanner.transaction.entity.Transaction;
import com.budgetplanner.category.entity.CategoryType;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;

public interface TransactionRepository extends JpaRepository<Transaction,Long> {
	boolean existsByCategoryId(Long categoryId);

	@Query("""
    SELECT t FROM Transaction t JOIN FETCH t.category
    WHERE (:type IS NULL OR t.type = :type)
      AND (:categoryId IS NULL OR t.category.id = :categoryId)
      AND (:dateFrom IS NULL OR t.transactionDate >= :dateFrom)
      AND (:dateTo IS NULL OR t.transactionDate <= :dateTo)
    """)
	Page<Transaction> findFiltered(
			@Param("type") CategoryType type,
			@Param("categoryId") Long categoryId,
			@Param("dateFrom") LocalDate dateFrom,
			@Param("dateTo") LocalDate dateTo,
			Pageable pageable
	);
}

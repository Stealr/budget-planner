package com.budgetplanner.transaction.repository;

import com.budgetplanner.transaction.entity.Transaction;
import com.budgetplanner.category.entity.CategoryType;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.Optional;

public interface TransactionRepository extends JpaRepository<Transaction,Long> {
	boolean existsByCategoryId(Long categoryId);

	Optional<Transaction> findByIdAndCategoryOwnerId(Long id, Long ownerId);

	@Query("""
    SELECT t FROM Transaction t JOIN FETCH t.category
    WHERE t.category.ownerId = :ownerId
      AND (:type IS NULL OR t.type = :type)
      AND (:categoryId IS NULL OR t.category.id = :categoryId)
      AND (:dateFrom IS NULL OR t.transactionDate >= :dateFrom)
      AND (:dateTo IS NULL OR t.transactionDate <= :dateTo)
    """)
	Page<Transaction> findFiltered(
			@Param("ownerId") Long ownerId,
			@Param("type") CategoryType type,
			@Param("categoryId") Long categoryId,
			@Param("dateFrom") LocalDate dateFrom,
			@Param("dateTo") LocalDate dateTo,
			Pageable pageable
	);
}

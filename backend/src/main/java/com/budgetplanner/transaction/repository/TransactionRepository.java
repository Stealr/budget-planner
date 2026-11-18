package com.budgetplanner.transaction.repository;

import com.budgetplanner.category.entity.CategoryType;
import com.budgetplanner.transaction.entity.Transaction;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Optional;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    boolean existsByCategoryId(Long categoryId);

    Optional<Transaction> findByIdAndOwnerId(Long id, Long ownerId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from Transaction t where t.id = :id and t.ownerId = :ownerId")
    Optional<Transaction> findForUpdate(@Param("id") Long id, @Param("ownerId") Long ownerId);

    @Query("""
            select t from Transaction t join fetch t.category
            where t.ownerId = :ownerId
              and (:type is null or t.type = :type)
              and (:categoryId is null or t.category.id = :categoryId)
              and (cast(:dateFrom as LocalDate) is null or t.transactionDate >= :dateFrom)
              and (cast(:dateTo as LocalDate) is null or t.transactionDate <= :dateTo)
            """)
    Page<Transaction> findFiltered(@Param("ownerId") Long ownerId,
                                   @Param("type") CategoryType type,
                                   @Param("categoryId") Long categoryId,
                                   @Param("dateFrom") LocalDate dateFrom,
                                   @Param("dateTo") LocalDate dateTo,
                                   Pageable pageable);
}

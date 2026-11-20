package com.budgetplanner.recurring.repository;

import com.budgetplanner.recurring.entity.RecurringPayment;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RecurringPaymentRepository extends JpaRepository<RecurringPayment, Long> {
    boolean existsByCategoryId(Long categoryId);

    @Query("""
            select p from RecurringPayment p join fetch p.category
            where p.ownerId = :ownerId order by p.id
            """)
    List<RecurringPayment> findAllForOwner(@Param("ownerId") Long ownerId);

    @Query("""
            select p from RecurringPayment p join fetch p.category c
            where p.ownerId = :ownerId and p.remindersEnabled = true and c.archivedAt is null
            """)
    List<RecurringPayment> findReminderCandidates(@Param("ownerId") Long ownerId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<RecurringPayment> findByIdAndOwnerId(Long id, Long ownerId);
}

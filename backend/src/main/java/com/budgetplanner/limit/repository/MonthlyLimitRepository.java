package com.budgetplanner.limit.repository;

import com.budgetplanner.limit.entity.MonthlyLimit;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface MonthlyLimitRepository extends JpaRepository<MonthlyLimit, Long> {
    Optional<MonthlyLimit> findByOwnerIdAndCategoryIdAndMonthStart(Long ownerId, Long categoryId, LocalDate monthStart);

    boolean existsByCategoryId(Long categoryId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select l from MonthlyLimit l
            where l.ownerId = :ownerId and l.category.id = :categoryId and l.monthStart = :monthStart
            """)
    Optional<MonthlyLimit> findForWarning(@Param("ownerId") Long ownerId,
                                          @Param("categoryId") Long categoryId,
                                          @Param("monthStart") LocalDate monthStart);

    @Query("""
            select c.id as categoryId, c.name as categoryName, l.amount as limitAmount,
                   l.monthStart as monthStart, sum(t.amount) as spentAmount
            from MonthlyLimit l join l.category c
            left join Transaction t on t.category.id = c.id and t.ownerId = :ownerId
                 and t.type = com.budgetplanner.category.entity.CategoryType.EXPENSE
                 and t.transactionDate >= l.monthStart and t.transactionDate < (l.monthStart + 1 month)
            where l.ownerId = :ownerId and l.monthStart between :firstMonth and :lastMonth
              and (:categoryId is null or c.id = :categoryId)
            group by l.monthStart, c.id, c.name, l.amount
            order by l.monthStart, c.id
            """)
    List<Progress> findProgress(@Param("ownerId") Long ownerId,
                                @Param("firstMonth") LocalDate firstMonth,
                                @Param("lastMonth") LocalDate lastMonth,
                                @Param("categoryId") Long categoryId);

    interface Progress {
        Long getCategoryId();

        String getCategoryName();

        LocalDate getMonthStart();

        BigDecimal getLimitAmount();

        BigDecimal getSpentAmount();
    }
}

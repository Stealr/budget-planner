package com.budgetplanner.limit.repository;

import com.budgetplanner.limit.entity.MonthlyLimit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface MonthlyLimitRepository extends JpaRepository<MonthlyLimit, Long> {
    Optional<MonthlyLimit> findByOwnerIdAndCategoryIdAndMonthStart(Long ownerId, Long categoryId, LocalDate monthStart);

    boolean existsByCategoryId(Long categoryId);

    @Query("""
            select c.id as categoryId, c.name as categoryName, l.amount as limitAmount,
                   sum(t.amount) as spentAmount
            from MonthlyLimit l join l.category c
            left join Transaction t on t.category.id = c.id and t.ownerId = :ownerId
                 and t.type = com.budgetplanner.category.entity.CategoryType.EXPENSE
                 and t.transactionDate >= :monthStart and t.transactionDate < :nextMonthStart
            where l.ownerId = :ownerId and l.monthStart = :monthStart and (:categoryId is null or c.id = :categoryId)
            group by c.id, c.name, l.amount
            order by c.id
            """)
    List<Progress> findProgress(@Param("ownerId") Long ownerId,
                                @Param("monthStart") LocalDate monthStart,
                                @Param("nextMonthStart") LocalDate nextMonthStart,
                                @Param("categoryId") Long categoryId);

    interface Progress {
        Long getCategoryId();

        String getCategoryName();

        BigDecimal getLimitAmount();

        BigDecimal getSpentAmount();
    }
}

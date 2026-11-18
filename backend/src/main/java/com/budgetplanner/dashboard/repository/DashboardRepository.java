package com.budgetplanner.dashboard.repository;

import com.budgetplanner.dashboard.dto.CategoryExpenseResponse;
import com.budgetplanner.transaction.entity.Transaction;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface DashboardRepository extends Repository<Transaction, Long> {
    @Query("""
            select coalesce(sum(case
                when t.type = com.budgetplanner.category.entity.CategoryType.INCOME then t.amount
                else -t.amount
            end), 0BD)
            from Transaction t
            where t.ownerId = :ownerId and t.transactionDate < :dateFrom
            """)
    BigDecimal openingBalance(@Param("ownerId") Long ownerId, @Param("dateFrom") LocalDate dateFrom);

    @Query("""
            select t.transactionDate as date,
                   sum(case when t.type = com.budgetplanner.category.entity.CategoryType.INCOME
                            then t.amount else 0BD end) as income,
                   sum(case when t.type = com.budgetplanner.category.entity.CategoryType.EXPENSE
                            then t.amount else 0BD end) as expenses
            from Transaction t
            where t.ownerId = :ownerId and t.transactionDate between :dateFrom and :dateTo
            group by t.transactionDate
            order by t.transactionDate
            """)
    List<DailyTotals> dailyTotals(@Param("ownerId") Long ownerId,
                                 @Param("dateFrom") LocalDate dateFrom,
                                 @Param("dateTo") LocalDate dateTo);

    @Query("""
            select new com.budgetplanner.dashboard.dto.CategoryExpenseResponse(c.id, c.name, sum(t.amount))
            from Transaction t join t.category c
            where t.ownerId = :ownerId and t.transactionDate between :dateFrom and :dateTo
              and t.type = com.budgetplanner.category.entity.CategoryType.EXPENSE
            group by c.id, c.name
            order by sum(t.amount) desc, c.id
            """)
    List<CategoryExpenseResponse> expensesByCategory(@Param("ownerId") Long ownerId,
                                                      @Param("dateFrom") LocalDate dateFrom,
                                                      @Param("dateTo") LocalDate dateTo);

    interface DailyTotals {
        LocalDate getDate();

        BigDecimal getIncome();

        BigDecimal getExpenses();
    }
}

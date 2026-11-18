package com.budgetplanner.goal.repository;

import com.budgetplanner.goal.entity.SavingsGoal;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface SavingsGoalRepository extends JpaRepository<SavingsGoal, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<SavingsGoal> findByIdAndOwnerId(Long id, Long ownerId);

    @Query("""
            select g.id as id, g.name as name, g.targetAmount as targetAmount, g.dueDate as dueDate,
                   coalesce(sum(c.amount), 0BD) as savedAmount
            from SavingsGoal g left join GoalContribution c on c.goal.id = g.id
            where g.ownerId = :ownerId and (:goalId is null or g.id = :goalId)
            group by g.id, g.name, g.targetAmount, g.dueDate
            order by g.dueDate, g.id
            """)
    List<Progress> findProgress(@Param("ownerId") Long ownerId, @Param("goalId") Long goalId);

    interface Progress {
        Long getId();

        String getName();

        BigDecimal getTargetAmount();

        LocalDate getDueDate();

        BigDecimal getSavedAmount();
    }
}

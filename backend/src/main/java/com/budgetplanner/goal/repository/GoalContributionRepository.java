package com.budgetplanner.goal.repository;

import com.budgetplanner.goal.entity.GoalContribution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

public interface GoalContributionRepository extends JpaRepository<GoalContribution, Long> {
    Optional<GoalContribution> findByGoalIdAndRequestId(Long goalId, UUID requestId);

    @Query("""
            select coalesce(sum(c.amount), 0BD)
            from GoalContribution c
            where c.goal.ownerId = :ownerId and c.contributionDate <= :dateTo
            """)
    BigDecimal sumReservedThrough(@Param("ownerId") Long ownerId, @Param("dateTo") LocalDate dateTo);
}

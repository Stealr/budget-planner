package com.budgetplanner.goal.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Getter
@Entity
@Table(name = "goal_contributions")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class GoalContribution {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "goal_id", nullable = false, updatable = false)
    private SavingsGoal goal;

    @Column(name = "request_id", nullable = false, updatable = false)
    private UUID requestId;

    @Column(nullable = false, precision = 19, scale = 2, updatable = false)
    private BigDecimal amount;

    @Column(name = "contribution_date", nullable = false, updatable = false)
    private LocalDate contributionDate;

    public GoalContribution(SavingsGoal goal, UUID requestId, BigDecimal amount, LocalDate contributionDate) {
        this.goal = goal;
        this.requestId = requestId;
        this.amount = amount;
        this.contributionDate = contributionDate;
    }
}

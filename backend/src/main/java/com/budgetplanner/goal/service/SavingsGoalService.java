package com.budgetplanner.goal.service;

import com.budgetplanner.common.exception.BusinessConflictException;
import com.budgetplanner.common.exception.ResourceNotFoundException;
import com.budgetplanner.goal.dto.SavingsGoalRequest;
import com.budgetplanner.goal.dto.SavingsGoalResponse;
import com.budgetplanner.goal.entity.GoalContribution;
import com.budgetplanner.goal.entity.SavingsGoal;
import com.budgetplanner.goal.repository.GoalContributionRepository;
import com.budgetplanner.goal.repository.SavingsGoalRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SavingsGoalService {
    private final SavingsGoalRepository goals;
    private final GoalContributionRepository contributions;
    private final Clock clock;

    @Transactional
    public SavingsGoalResponse create(Long ownerId, SavingsGoalRequest request) {
        SavingsGoal goal = goals.save(new SavingsGoal(ownerId, request.name().strip(),
                request.targetAmount(), request.dueDate()));
        return get(ownerId, goal.getId());
    }

    @Transactional(readOnly = true)
    public List<SavingsGoalResponse> list(Long ownerId) {
        return goals.findProgress(ownerId, null).stream().map(SavingsGoalService::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public SavingsGoalResponse get(Long ownerId, Long goalId) {
        return goals.findProgress(ownerId, goalId).stream().findFirst()
                .map(SavingsGoalService::toResponse)
                .orElseThrow(() -> notFound(goalId));
    }

    @Transactional
    public SavingsGoalResponse contribute(Long ownerId, Long goalId, UUID requestId, BigDecimal amount) {
        SavingsGoal goal = goals.findByIdAndOwnerId(goalId, ownerId).orElseThrow(() -> notFound(goalId));
        var existing = contributions.findByGoalIdAndRequestId(goalId, requestId);
        if (existing.isEmpty()) {
            contributions.save(new GoalContribution(goal, requestId, amount, LocalDate.now(clock)));
        } else if (existing.get().getAmount().compareTo(amount) != 0) {
            throw new BusinessConflictException("Contribution identifier is already in use with a different amount");
        }

        return get(ownerId, goalId);
    }

    @Transactional(readOnly = true)
    public BigDecimal reservedThrough(Long ownerId, LocalDate dateTo) {
        return contributions.sumReservedThrough(ownerId, dateTo).setScale(2);
    }

    private static SavingsGoalResponse toResponse(SavingsGoalRepository.Progress goal) {
        BigDecimal saved = goal.getSavedAmount().setScale(2);
        BigDecimal target = goal.getTargetAmount();
        return new SavingsGoalResponse(goal.getId(), goal.getName(), target, goal.getDueDate(), saved,
                saved.movePointRight(2).divide(target, 2, RoundingMode.HALF_UP), saved.compareTo(target) >= 0);
    }

    private static ResourceNotFoundException notFound(Long id) {
        return new ResourceNotFoundException("Savings goal not found: " + id);
    }
}

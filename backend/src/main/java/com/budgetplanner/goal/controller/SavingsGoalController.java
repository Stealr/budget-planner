package com.budgetplanner.goal.controller;

import com.budgetplanner.auth.security.CurrentUserId;
import com.budgetplanner.goal.dto.GoalContributionRequest;
import com.budgetplanner.goal.dto.SavingsGoalRequest;
import com.budgetplanner.goal.dto.SavingsGoalResponse;
import com.budgetplanner.goal.service.SavingsGoalService;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Tag(name = "Savings goals", description = "Savings goals and contributions")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/goals")
public class SavingsGoalController {
    private final SavingsGoalService goals;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SavingsGoalResponse create(@Parameter(hidden = true) @CurrentUserId Long ownerId,
                                      @Valid @RequestBody SavingsGoalRequest request) {
        return goals.create(ownerId, request);
    }

    @GetMapping
    public List<SavingsGoalResponse> list(@Parameter(hidden = true) @CurrentUserId Long ownerId) {
        return goals.list(ownerId);
    }

    @GetMapping("/{goalId}")
    public SavingsGoalResponse get(@Parameter(hidden = true) @CurrentUserId Long ownerId,
                                   @PathVariable Long goalId) {
        return goals.get(ownerId, goalId);
    }

    @PutMapping("/{goalId}/contributions/{requestId}")
    public SavingsGoalResponse contribute(@Parameter(hidden = true) @CurrentUserId Long ownerId,
                                          @PathVariable Long goalId, @PathVariable UUID requestId,
                                          @Valid @RequestBody GoalContributionRequest request) {
        return goals.contribute(ownerId, goalId, requestId, request.amount());
    }
}

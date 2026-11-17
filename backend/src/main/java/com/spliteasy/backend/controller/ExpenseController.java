package com.spliteasy.backend.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.spliteasy.backend.dto.ExpenseRequest;
import com.spliteasy.backend.dto.ExpenseResponse;
import com.spliteasy.backend.service.ExpenseService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/groups/{groupId}/expenses")
@RequiredArgsConstructor
public class ExpenseController {

    private final ExpenseService expenseService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ExpenseResponse createExpense(
            @PathVariable Long groupId,
            @Valid @RequestBody ExpenseRequest request
    ) {
        return expenseService.createExpense(groupId, request);
    }

    @GetMapping
    public List<ExpenseResponse> getGroupExpenses(@PathVariable Long groupId) {
        return expenseService.getGroupExpenses(groupId);
    }

    @PutMapping("/{expenseId}")
    public ExpenseResponse updateExpense(
            @PathVariable Long groupId,
            @PathVariable Long expenseId,
            @Valid @RequestBody ExpenseRequest request
    ) {
        return expenseService.updateExpense(groupId, expenseId, request);
    }

    @DeleteMapping("/{expenseId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteExpense(
            @PathVariable Long groupId,
            @PathVariable Long expenseId
    ) {
        expenseService.deleteExpense(groupId, expenseId);
    }
}

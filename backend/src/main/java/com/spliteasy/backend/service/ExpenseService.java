package com.spliteasy.backend.service;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.spliteasy.backend.dto.ExpenseRequest;
import com.spliteasy.backend.dto.ExpenseResponse;
import com.spliteasy.backend.dto.SplitItemRequest;
import com.spliteasy.backend.dto.SplitItemResponse;
import com.spliteasy.backend.entity.Expense;
import com.spliteasy.backend.entity.ExpenseSplit;
import com.spliteasy.backend.entity.Group;
import com.spliteasy.backend.entity.User;
import com.spliteasy.backend.exception.BadRequestException;
import com.spliteasy.backend.exception.ForbiddenException;
import com.spliteasy.backend.exception.ResourceNotFoundException;
import com.spliteasy.backend.repository.ExpenseRepository;
import com.spliteasy.backend.repository.GroupMemberRepository;
import com.spliteasy.backend.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final UserRepository userRepository;
    private final GroupService groupService;
    private final AuthService authService;

    @Transactional
    public ExpenseResponse createExpense(Long groupId, ExpenseRequest request) {
        User currentUser = authService.getCurrentUser();
        Group group = groupService.findGroupAndVerifyMembership(groupId, currentUser.getId());

        validateExpenseData(groupId, request);

        User paidBy = userRepository.findById(request.getPaidById())
                .orElseThrow(() -> new ResourceNotFoundException("El usuario que pagó no existe"));

        Expense expense = Expense.builder()
                .group(group)
                .paidBy(paidBy)
                .createdBy(currentUser)
                .amount(request.getAmount())
                .description(request.getDescription().trim())
                .category(request.getCategory().trim())
                .expenseDate(request.getExpenseDate())
                .build();

        for (SplitItemRequest splitReq : request.getSplits()) {
            User memberUser = userRepository.findById(splitReq.getUserId())
                    .orElseThrow(() -> new ResourceNotFoundException("Participante no encontrado"));

            ExpenseSplit split = ExpenseSplit.builder()
                    .expense(expense)
                    .user(memberUser)
                    .amountOwed(splitReq.getAmountOwed())
                    .build();
            expense.getSplits().add(split);
        }

        Expense savedExpense = expenseRepository.save(expense);
        return mapToExpenseResponse(savedExpense);
    }

    @Transactional(readOnly = true)
    public List<ExpenseResponse> getGroupExpenses(Long groupId) {
        User currentUser = authService.getCurrentUser();
        groupService.findGroupAndVerifyMembership(groupId, currentUser.getId());

        return expenseRepository.findByGroupIdOrderByExpenseDateDescCreatedAtDesc(groupId).stream()
                .map(this::mapToExpenseResponse)
                .toList();
    }

    @Transactional
    public ExpenseResponse updateExpense(Long groupId, Long expenseId, ExpenseRequest request) {
        User currentUser = authService.getCurrentUser();
        groupService.findGroupAndVerifyMembership(groupId, currentUser.getId());

        Expense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new ResourceNotFoundException("Gasto no encontrado"));

        if (!expense.getGroup().getId().equals(groupId)) {
            throw new BadRequestException("El gasto no pertenece a este grupo");
        }

        if (!expense.getCreatedBy().getId().equals(currentUser.getId())) {
            throw new ForbiddenException("Solo el usuario que cargó el gasto puede editarlo");
        }

        validateExpenseData(groupId, request);

        User paidBy = userRepository.findById(request.getPaidById())
                .orElseThrow(() -> new ResourceNotFoundException("El usuario que pagó no existe"));

        expense.setPaidBy(paidBy);
        expense.setAmount(request.getAmount());
        expense.setDescription(request.getDescription().trim());
        expense.setCategory(request.getCategory().trim());
        expense.setExpenseDate(request.getExpenseDate());

        expense.getSplits().clear();
        for (SplitItemRequest splitReq : request.getSplits()) {
            User memberUser = userRepository.findById(splitReq.getUserId())
                    .orElseThrow(() -> new ResourceNotFoundException("Participante no encontrado"));

            ExpenseSplit split = ExpenseSplit.builder()
                    .expense(expense)
                    .user(memberUser)
                    .amountOwed(splitReq.getAmountOwed())
                    .build();
            expense.getSplits().add(split);
        }

        Expense updatedExpense = expenseRepository.save(expense);
        return mapToExpenseResponse(updatedExpense);
    }

    @Transactional
    public void deleteExpense(Long groupId, Long expenseId) {
        User currentUser = authService.getCurrentUser();
        groupService.findGroupAndVerifyMembership(groupId, currentUser.getId());

        Expense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new ResourceNotFoundException("Gasto no encontrado"));

        if (!expense.getGroup().getId().equals(groupId)) {
            throw new BadRequestException("El gasto no pertenece a este grupo");
        }

        if (!expense.getCreatedBy().getId().equals(currentUser.getId())) {
            throw new ForbiddenException("Solo el usuario que cargó el gasto puede eliminarlo");
        }

        expenseRepository.delete(expense);
    }

    private void validateExpenseData(Long groupId, ExpenseRequest request) {
        if (!groupMemberRepository.existsByGroupIdAndUserId(groupId, request.getPaidById())) {
            throw new BadRequestException("La persona que pagó debe pertenecer al grupo");
        }

        Set<Long> seenUsers = new HashSet<>();
        BigDecimal splitsSum = BigDecimal.ZERO;

        for (SplitItemRequest split : request.getSplits()) {
            if (!seenUsers.add(split.getUserId())) {
                throw new BadRequestException("No se puede repetir el mismo participante en la división del gasto");
            }
            if (!groupMemberRepository.existsByGroupIdAndUserId(groupId, split.getUserId())) {
                throw new BadRequestException("Todos los participantes de la división deben pertenecer al grupo");
            }
            splitsSum = splitsSum.add(split.getAmountOwed());
        }

        if (splitsSum.compareTo(request.getAmount()) != 0) {
            throw new BadRequestException(
                    "La suma de las divisiones ($" + splitsSum + ") debe coincidir exactamente con el monto total ($" + request.getAmount() + ")"
            );
        }
    }

    private ExpenseResponse mapToExpenseResponse(Expense expense) {
        List<SplitItemResponse> splitResponses = expense.getSplits().stream()
                .map(s -> SplitItemResponse.builder()
                        .userId(s.getUser().getId())
                        .userName(s.getUser().getName())
                        .amountOwed(s.getAmountOwed())
                        .build())
                .toList();

        return ExpenseResponse.builder()
                .id(expense.getId())
                .groupId(expense.getGroup().getId())
                .paidById(expense.getPaidBy().getId())
                .paidByName(expense.getPaidBy().getName())
                .createdById(expense.getCreatedBy().getId())
                .createdByName(expense.getCreatedBy().getName())
                .amount(expense.getAmount())
                .description(expense.getDescription())
                .category(expense.getCategory())
                .expenseDate(expense.getExpenseDate())
                .splits(splitResponses)
                .build();
    }
}

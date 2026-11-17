package com.spliteasy.backend.service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.spliteasy.backend.dto.GroupSummaryResponse;
import com.spliteasy.backend.dto.MemberBalanceResponse;
import com.spliteasy.backend.dto.SimplifiedDebtResponse;
import com.spliteasy.backend.entity.Expense;
import com.spliteasy.backend.entity.ExpenseSplit;
import com.spliteasy.backend.entity.GroupMember;
import com.spliteasy.backend.entity.Payment;
import com.spliteasy.backend.entity.User;
import com.spliteasy.backend.repository.ExpenseRepository;
import com.spliteasy.backend.repository.ExpenseSplitRepository;
import com.spliteasy.backend.repository.GroupMemberRepository;
import com.spliteasy.backend.repository.PaymentRepository;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class BalanceService {

    private final GroupMemberRepository groupMemberRepository;
    private final ExpenseRepository expenseRepository;
    private final ExpenseSplitRepository expenseSplitRepository;
    private final PaymentRepository paymentRepository;
    private final GroupService groupService;
    private final AuthService authService;

    @Data
    @AllArgsConstructor
    private static class NodeBalance {
        private Long userId;
        private String userName;
        private BigDecimal amount;
    }

    @Transactional(readOnly = true)
    public GroupSummaryResponse getGroupSummary(Long groupId) {
        User currentUser = authService.getCurrentUser();
        groupService.findGroupAndVerifyMembership(groupId, currentUser.getId());

        List<GroupMember> members = groupMemberRepository.findByGroupId(groupId);
        List<Expense> expenses = expenseRepository.findByGroupIdOrderByExpenseDateDescCreatedAtDesc(groupId);
        List<ExpenseSplit> splits = expenseSplitRepository.findByExpenseGroupId(groupId);
        List<Payment> payments = paymentRepository.findByGroupIdOrderByPaymentDateDescCreatedAtDesc(groupId);

        Map<Long, BigDecimal> paidMap = new HashMap<>();
        Map<Long, BigDecimal> consumedMap = new HashMap<>();
        Map<Long, BigDecimal> sentPaymentsMap = new HashMap<>();
        Map<Long, BigDecimal> receivedPaymentsMap = new HashMap<>();

        for (GroupMember gm : members) {
            Long uid = gm.getUser().getId();
            paidMap.put(uid, BigDecimal.ZERO);
            consumedMap.put(uid, BigDecimal.ZERO);
            sentPaymentsMap.put(uid, BigDecimal.ZERO);
            receivedPaymentsMap.put(uid, BigDecimal.ZERO);
        }

        for (Expense e : expenses) {
            Long uid = e.getPaidBy().getId();
            paidMap.put(uid, paidMap.getOrDefault(uid, BigDecimal.ZERO).add(e.getAmount()));
        }

        for (ExpenseSplit s : splits) {
            Long uid = s.getUser().getId();
            consumedMap.put(uid, consumedMap.getOrDefault(uid, BigDecimal.ZERO).add(s.getAmountOwed()));
        }

        for (Payment p : payments) {
            Long fromId = p.getFromUser().getId();
            Long toId = p.getToUser().getId();
            sentPaymentsMap.put(fromId, sentPaymentsMap.getOrDefault(fromId, BigDecimal.ZERO).add(p.getAmount()));
            receivedPaymentsMap.put(toId, receivedPaymentsMap.getOrDefault(toId, BigDecimal.ZERO).add(p.getAmount()));
        }

        List<MemberBalanceResponse> balances = new ArrayList<>();
        List<NodeBalance> debtors = new ArrayList<>();
        List<NodeBalance> creditors = new ArrayList<>();

        for (GroupMember gm : members) {
            User u = gm.getUser();
            Long uid = u.getId();

            BigDecimal totalPaid = paidMap.get(uid);
            BigDecimal totalConsumed = consumedMap.get(uid);
            BigDecimal netBalance = totalPaid
                    .subtract(totalConsumed)
                    .add(sentPaymentsMap.get(uid))
                    .subtract(receivedPaymentsMap.get(uid));

            balances.add(MemberBalanceResponse.builder()
                    .userId(uid)
                    .userName(u.getName())
                    .totalPaid(totalPaid)
                    .totalConsumed(totalConsumed)
                    .netBalance(netBalance)
                    .build());

            if (netBalance.compareTo(BigDecimal.ZERO) < 0) {
                debtors.add(new NodeBalance(uid, u.getName(), netBalance.abs()));
            } else if (netBalance.compareTo(BigDecimal.ZERO) > 0) {
                creditors.add(new NodeBalance(uid, u.getName(), netBalance));
            }
        }

        debtors.sort((a, b) -> b.getAmount().compareTo(a.getAmount()));
        creditors.sort((a, b) -> b.getAmount().compareTo(a.getAmount()));

        List<SimplifiedDebtResponse> simplifiedDebts = new ArrayList<>();
        int i = 0;
        int j = 0;

        while (i < debtors.size() && j < creditors.size()) {
            NodeBalance debtor = debtors.get(i);
            NodeBalance creditor = creditors.get(j);

            BigDecimal transferAmount = debtor.getAmount().min(creditor.getAmount());

            if (transferAmount.compareTo(BigDecimal.ZERO) > 0) {
                simplifiedDebts.add(SimplifiedDebtResponse.builder()
                        .fromUserId(debtor.getUserId())
                        .fromUserName(debtor.getUserName())
                        .toUserId(creditor.getUserId())
                        .toUserName(creditor.getUserName())
                        .amount(transferAmount)
                        .build());
            }

            debtor.setAmount(debtor.getAmount().subtract(transferAmount));
            creditor.setAmount(creditor.getAmount().subtract(transferAmount));

            if (debtor.getAmount().compareTo(BigDecimal.ZERO) == 0) {
                i++;
            }
            if (creditor.getAmount().compareTo(BigDecimal.ZERO) == 0) {
                j++;
            }
        }

        return GroupSummaryResponse.builder()
                .balances(balances)
                .simplifiedDebts(simplifiedDebts)
                .build();
    }
}

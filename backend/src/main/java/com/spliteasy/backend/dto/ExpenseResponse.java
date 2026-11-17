package com.spliteasy.backend.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ExpenseResponse {
    private Long id;
    private Long groupId;
    private Long paidById;
    private String paidByName;
    private Long createdById;
    private String createdByName;
    private BigDecimal amount;
    private String description;
    private String category;
    private LocalDate expenseDate;
    private List<SplitItemResponse> splits;
}

package com.spliteasy.backend.dto;

import java.math.BigDecimal;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class MemberBalanceResponse {
    private Long userId;
    private String userName;
    private BigDecimal totalPaid;
    private BigDecimal totalConsumed;
    private BigDecimal netBalance;
}
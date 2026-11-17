package com.spliteasy.backend.dto;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class GroupSummaryResponse {
    private List<MemberBalanceResponse> balances;
    private List<SimplifiedDebtResponse> simplifiedDebts;
}

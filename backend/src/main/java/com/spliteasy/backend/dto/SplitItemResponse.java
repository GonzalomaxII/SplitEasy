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
public class SplitItemResponse {
    private Long userId;
    private String userName;
    private BigDecimal amountOwed;
}

package com.spliteasy.backend.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Data;

@Data
public class SplitItemRequest {
    @NotNull(message = "El ID del usuario es obligatorio")
    private Long userId;

    @NotNull(message = "El monto asignado es obligatorio")
    @PositiveOrZero(message = "El monto asignado no puede ser negativo")
    private BigDecimal amountOwed;
}

package com.spliteasy.backend.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

@Data
public class ExpenseRequest {
    @NotNull(message = "Debe indicar quién pagó el gasto")
    private Long paidById;

    @NotNull(message = "El monto total es obligatorio")
    @Positive(message = "El monto total debe ser mayor a cero")
    private BigDecimal amount;

    @NotBlank(message = "La descripción es obligatoria")
    private String description;

    @NotBlank(message = "La categoría es obligatoria")
    private String category;

    @NotNull(message = "La fecha del gasto es obligatoria")
    private LocalDate expenseDate;

    @NotEmpty(message = "Debe incluir al menos un participante en la división")
    @Valid
    private List<SplitItemRequest> splits;
}

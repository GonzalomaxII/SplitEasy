package com.spliteasy.backend.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

@Data
public class PaymentRequest {
    @NotNull(message = "Debe indicar quién realiza el pago")
    private Long fromUserId;

    @NotNull(message = "Debe indicar quién recibe el pago")
    private Long toUserId;

    @NotNull(message = "El monto del pago es obligatorio")
    @Positive(message = "El monto del pago debe ser mayor a cero")
    private BigDecimal amount;

    @NotNull(message = "La fecha del pago es obligatoria")
    private LocalDate paymentDate;
}

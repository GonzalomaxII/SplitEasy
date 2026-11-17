package com.spliteasy.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AddMemberRequest {
    @NotBlank(message = "El email del usuario a agregar es obligatorio")
    @Email(message = "Formato de email inválido")
    private String email;
}

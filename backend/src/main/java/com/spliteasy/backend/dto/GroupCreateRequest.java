package com.spliteasy.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class GroupCreateRequest {
    @NotBlank(message = "El nombre del grupo es obligatorio")
    private String name;

    private String description;
}

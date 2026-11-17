package com.spliteasy.backend.dto;

import java.time.LocalDateTime;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class GroupResponse {
    private Long id;
    private String name;
    private String description;
    private Long createdById;
    private String createdByName;
    private List<MemberResponse> members;
    private LocalDateTime createdAt;
}

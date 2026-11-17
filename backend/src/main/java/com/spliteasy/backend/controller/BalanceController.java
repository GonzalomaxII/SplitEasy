package com.spliteasy.backend.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.spliteasy.backend.dto.GroupSummaryResponse;
import com.spliteasy.backend.service.BalanceService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/groups/{groupId}/summary")
@RequiredArgsConstructor
public class BalanceController {

    private final BalanceService balanceService;

    @GetMapping
    public GroupSummaryResponse getGroupSummary(@PathVariable Long groupId) {
        return balanceService.getGroupSummary(groupId);
    }
}

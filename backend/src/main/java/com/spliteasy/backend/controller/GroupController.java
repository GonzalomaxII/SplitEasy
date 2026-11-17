package com.spliteasy.backend.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.spliteasy.backend.dto.AddMemberRequest;
import com.spliteasy.backend.dto.GroupCreateRequest;
import com.spliteasy.backend.dto.GroupResponse;
import com.spliteasy.backend.service.GroupService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/groups")
@RequiredArgsConstructor
public class GroupController {

    private final GroupService groupService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public GroupResponse createGroup(@Valid @RequestBody GroupCreateRequest request) {
        return groupService.createGroup(request);
    }

    @GetMapping
    public List<GroupResponse> getMyGroups() {
        return groupService.getMyGroups();
    }

    @GetMapping("/{groupId}")
    public GroupResponse getGroupDetail(@PathVariable Long groupId) {
        return groupService.getGroupDetail(groupId);
    }

    @PostMapping("/{groupId}/members")
    public GroupResponse addMember(
            @PathVariable Long groupId,
            @Valid @RequestBody AddMemberRequest request
    ) {
        return groupService.addMember(groupId, request);
    }

    @DeleteMapping("/{groupId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteGroup(@PathVariable Long groupId) {
        groupService.deleteGroup(groupId);
    }
}

package com.spliteasy.backend.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.spliteasy.backend.dto.AddMemberRequest;
import com.spliteasy.backend.dto.GroupCreateRequest;
import com.spliteasy.backend.dto.GroupResponse;
import com.spliteasy.backend.dto.MemberResponse;
import com.spliteasy.backend.entity.Group;
import com.spliteasy.backend.entity.GroupMember;
import com.spliteasy.backend.entity.User;
import com.spliteasy.backend.exception.BadRequestException;
import com.spliteasy.backend.exception.ForbiddenException;
import com.spliteasy.backend.exception.ResourceNotFoundException;
import com.spliteasy.backend.repository.ExpenseRepository;
import com.spliteasy.backend.repository.GroupMemberRepository;
import com.spliteasy.backend.repository.GroupRepository;
import com.spliteasy.backend.repository.PaymentRepository;
import com.spliteasy.backend.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class GroupService {

    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final UserRepository userRepository;
    private final ExpenseRepository expenseRepository;
    private final PaymentRepository paymentRepository;
    private final AuthService authService;

    @Transactional
    public GroupResponse createGroup(GroupCreateRequest request) {
        User currentUser = authService.getCurrentUser();

        Group group = Group.builder()
                .name(request.getName().trim())
                .description(request.getDescription() != null ? request.getDescription().trim() : null)
                .createdBy(currentUser)
                .build();

        Group savedGroup = groupRepository.save(group);

        GroupMember creatorMembership = GroupMember.builder()
                .group(savedGroup)
                .user(currentUser)
                .build();
        groupMemberRepository.save(creatorMembership);

        return mapToGroupResponse(savedGroup);
    }

    @Transactional(readOnly = true)
    public List<GroupResponse> getMyGroups() {
        User currentUser = authService.getCurrentUser();
        List<GroupMember> memberships = groupMemberRepository.findByUserId(currentUser.getId());

        return memberships.stream()
                .map(membership -> mapToGroupResponse(membership.getGroup()))
                .toList();
    }

    @Transactional(readOnly = true)
    public GroupResponse getGroupDetail(Long groupId) {
        User currentUser = authService.getCurrentUser();
        Group group = findGroupAndVerifyMembership(groupId, currentUser.getId());
        return mapToGroupResponse(group);
    }

    @Transactional
    public GroupResponse addMember(Long groupId, AddMemberRequest request) {
        User currentUser = authService.getCurrentUser();
        Group group = findGroupAndVerifyMembership(groupId, currentUser.getId());

        String targetEmail = request.getEmail().trim().toLowerCase();
        User userToAdd = userRepository.findByEmail(targetEmail)
                .orElseThrow(() -> new ResourceNotFoundException("No existe ningún usuario registrado con el email: " + targetEmail));

        if (groupMemberRepository.existsByGroupIdAndUserId(groupId, userToAdd.getId())) {
            throw new BadRequestException("El usuario ya forma parte de este grupo");
        }

        GroupMember newMember = GroupMember.builder()
                .group(group)
                .user(userToAdd)
                .build();
        groupMemberRepository.save(newMember);

        return mapToGroupResponse(group);
    }

    @Transactional
    public void deleteGroup(Long groupId) {
        User currentUser = authService.getCurrentUser();
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Grupo no encontrado"));

        if (!group.getCreatedBy().getId().equals(currentUser.getId())) {
            throw new ForbiddenException("Solo el creador del grupo tiene permiso para eliminarlo");
        }

        paymentRepository.deleteByGroupId(groupId);
        expenseRepository.deleteByGroupId(groupId);
        groupMemberRepository.deleteByGroupId(groupId);
        groupRepository.delete(group);
    }

    public Group findGroupAndVerifyMembership(Long groupId, Long userId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Grupo no encontrado"));

        if (!groupMemberRepository.existsByGroupIdAndUserId(groupId, userId)) {
            throw new ForbiddenException("No tenés permiso para acceder a este grupo");
        }

        return group;
    }

    private GroupResponse mapToGroupResponse(Group group) {
        List<MemberResponse> members = groupMemberRepository.findByGroupId(group.getId()).stream()
                .map(gm -> MemberResponse.builder()
                        .userId(gm.getUser().getId())
                        .name(gm.getUser().getName())
                        .email(gm.getUser().getEmail())
                        .build())
                .toList();

        return GroupResponse.builder()
                .id(group.getId())
                .name(group.getName())
                .description(group.getDescription())
                .createdById(group.getCreatedBy().getId())
                .createdByName(group.getCreatedBy().getName())
                .members(members)
                .createdAt(group.getCreatedAt())
                .build();
    }
}
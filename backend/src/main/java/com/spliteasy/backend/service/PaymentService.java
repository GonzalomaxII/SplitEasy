package com.spliteasy.backend.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.spliteasy.backend.dto.PaymentRequest;
import com.spliteasy.backend.dto.PaymentResponse;
import com.spliteasy.backend.entity.Group;
import com.spliteasy.backend.entity.Payment;
import com.spliteasy.backend.entity.User;
import com.spliteasy.backend.exception.BadRequestException;
import com.spliteasy.backend.exception.ResourceNotFoundException;
import com.spliteasy.backend.repository.GroupMemberRepository;
import com.spliteasy.backend.repository.PaymentRepository;
import com.spliteasy.backend.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final UserRepository userRepository;
    private final GroupService groupService;
    private final AuthService authService;

    @Transactional
    public PaymentResponse registerPayment(Long groupId, PaymentRequest request) {
        User currentUser = authService.getCurrentUser();
        Group group = groupService.findGroupAndVerifyMembership(groupId, currentUser.getId());

        if (request.getFromUserId().equals(request.getToUserId())) {
            throw new BadRequestException("No se puede registrar un pago hacia la misma persona");
        }

        if (!groupMemberRepository.existsByGroupIdAndUserId(groupId, request.getFromUserId()) ||
            !groupMemberRepository.existsByGroupIdAndUserId(groupId, request.getToUserId())) {
            throw new BadRequestException("Tanto quien paga como quien recibe deben pertenecer al grupo");
        }

        User fromUser = userRepository.findById(request.getFromUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Usuario pagador no encontrado"));
        User toUser = userRepository.findById(request.getToUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Usuario receptor no encontrado"));

        Payment payment = Payment.builder()
                .group(group)
                .fromUser(fromUser)
                .toUser(toUser)
                .amount(request.getAmount())
                .paymentDate(request.getPaymentDate())
                .build();

        Payment savedPayment = paymentRepository.save(payment);
        return mapToPaymentResponse(savedPayment);
    }

    @Transactional(readOnly = true)
    public List<PaymentResponse> getGroupPayments(Long groupId) {
        User currentUser = authService.getCurrentUser();
        groupService.findGroupAndVerifyMembership(groupId, currentUser.getId());

        return paymentRepository.findByGroupIdOrderByPaymentDateDescCreatedAtDesc(groupId).stream()
                .map(this::mapToPaymentResponse)
                .toList();
    }

    private PaymentResponse mapToPaymentResponse(Payment payment) {
        return PaymentResponse.builder()
                .id(payment.getId())
                .groupId(payment.getGroup().getId())
                .fromUserId(payment.getFromUser().getId())
                .fromUserName(payment.getFromUser().getName())
                .toUserId(payment.getToUser().getId())
                .toUserName(payment.getToUser().getName())
                .amount(payment.getAmount())
                .paymentDate(payment.getPaymentDate())
                .build();
    }
}

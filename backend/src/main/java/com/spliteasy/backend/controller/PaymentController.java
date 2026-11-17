package com.spliteasy.backend.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.spliteasy.backend.dto.PaymentRequest;
import com.spliteasy.backend.dto.PaymentResponse;
import com.spliteasy.backend.service.PaymentService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/groups/{groupId}/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PaymentResponse registerPayment(
            @PathVariable Long groupId,
            @Valid @RequestBody PaymentRequest request
    ) {
        return paymentService.registerPayment(groupId, request);
    }

    @GetMapping
    public List<PaymentResponse> getGroupPayments(@PathVariable Long groupId) {
        return paymentService.getGroupPayments(groupId);
    }
}

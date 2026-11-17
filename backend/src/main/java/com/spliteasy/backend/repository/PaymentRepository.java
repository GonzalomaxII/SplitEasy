package com.spliteasy.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.spliteasy.backend.entity.Payment;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    List<Payment> findByGroupIdOrderByPaymentDateDescCreatedAtDesc(Long groupId);
    void deleteByGroupId(Long groupId);
}

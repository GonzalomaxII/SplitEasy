package com.spliteasy.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.spliteasy.backend.entity.Expense;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {
    List<Expense> findByGroupIdOrderByExpenseDateDescCreatedAtDesc(Long groupId);
    void deleteByGroupId(Long groupId);
}
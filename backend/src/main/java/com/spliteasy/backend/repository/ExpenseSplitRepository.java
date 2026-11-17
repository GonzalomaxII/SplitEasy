package com.spliteasy.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.spliteasy.backend.entity.ExpenseSplit;

public interface ExpenseSplitRepository extends JpaRepository<ExpenseSplit, Long> {
    List<ExpenseSplit> findByExpenseGroupId(Long groupId);
}

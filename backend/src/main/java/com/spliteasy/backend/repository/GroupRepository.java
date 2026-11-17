package com.spliteasy.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.spliteasy.backend.entity.Group;

public interface GroupRepository extends JpaRepository<Group, Long> {
}

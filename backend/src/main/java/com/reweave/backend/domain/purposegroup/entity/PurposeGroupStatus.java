package com.reweave.backend.domain.purposegroup.entity;

public enum PurposeGroupStatus {
    NOT_STARTED("시작 전"),
    IN_PROGRESS("진행 중"),
    COMPLETED("완료");

    private final String description;

    PurposeGroupStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}

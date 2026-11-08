package com.reweave.backend.domain.purposegroup.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record PurposeGroupOrderRequest(
        @NotEmpty(message = "정렬할 목적 그룹 ID 목록은 필수입니다.")
        List<@NotNull Long> purposeGroupIds
) {
}
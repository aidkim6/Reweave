package com.reweave.backend.domain.purposegroup.dto;

import com.reweave.backend.domain.purposegroup.entity.PurposeGroupStatus;
import jakarta.validation.constraints.NotNull;

public record PurposeGroupStatusRequest(
        @NotNull(message = "변경할 진행 상태를 입력해주세요.")
        PurposeGroupStatus status
) {
}

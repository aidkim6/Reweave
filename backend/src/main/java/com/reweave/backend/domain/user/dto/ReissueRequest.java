package com.reweave.backend.domain.user.dto;

import com.reweave.backend.domain.user.entity.ClientType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ReissueRequest(
        @NotBlank(message = "refreshToken을 입력해주세요.")
        String refreshToken,

        @NotNull(message = "clientType(WEB / EXTENSION)을 입력해주세요.")
        ClientType clientType
) {
}
package com.reweave.backend.domain.user.dto;

import com.reweave.backend.domain.user.entity.ClientType;
import jakarta.validation.constraints.NotNull;

public record LogoutRequest(
        @NotNull(message = "clientType(WEB / EXTENSION)을 입력해주세요.")
        ClientType clientType
) {
}
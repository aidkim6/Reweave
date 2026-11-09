package com.reweave.backend.domain.user.dto;

import com.reweave.backend.domain.user.entity.ClientType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record LoginRequest(
        @NotBlank(message = "이메일을 입력해주세요.")
        String email,

        @NotBlank(message = "비밀번호를 입력해주세요.")
        String password,

        @NotNull(message = "clientType(WEB / EXTENSION)을 입력해주세요.")
        ClientType clientType
) {
}
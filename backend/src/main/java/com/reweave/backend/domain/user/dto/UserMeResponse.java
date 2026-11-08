package com.reweave.backend.domain.user.dto;

import com.reweave.backend.domain.user.entity.User;

public record UserMeResponse(Long userId, String email, String nickname) {

    public static UserMeResponse from(User user) {
        return new UserMeResponse(user.getId(), user.getEmail(), user.getNickname());
    }
}
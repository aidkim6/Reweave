package com.reweave.backend.domain.user.service;

import com.reweave.backend.domain.user.dto.UserMeResponse;
import com.reweave.backend.domain.user.repository.UserRepository;
import com.reweave.backend.global.exception.CustomException;
import com.reweave.backend.global.exception.ErrorCode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public UserMeResponse getMe(Long userId) {
        return userRepository.findById(userId)
                .map(UserMeResponse::from)
                .orElseThrow(() -> new CustomException(ErrorCode.UNAUTHORIZED)); // 토큰은 유효한데 유저가 없는 경우
    }
}
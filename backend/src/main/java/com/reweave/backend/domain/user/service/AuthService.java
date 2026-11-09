package com.reweave.backend.domain.user.service;

import com.reweave.backend.domain.user.dto.*;
import com.reweave.backend.domain.user.entity.ClientType;
import com.reweave.backend.domain.user.entity.RefreshToken;
import com.reweave.backend.domain.user.entity.User;
import com.reweave.backend.domain.user.repository.RefreshTokenRepository;
import com.reweave.backend.domain.user.repository.UserRepository;
import com.reweave.backend.global.exception.CustomException;
import com.reweave.backend.global.exception.ErrorCode;
import com.reweave.backend.global.jwt.JwtProvider;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
@Transactional(readOnly = true)
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;

    public AuthService(UserRepository userRepository,
                       RefreshTokenRepository refreshTokenRepository,
                       PasswordEncoder passwordEncoder,
                       JwtProvider jwtProvider) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtProvider = jwtProvider;
    }

    // 회원가입
    @Transactional
    public SignupResponse signup(SignupRequest request) {
        String email = normalizeEmail(request.email());
        if (userRepository.existsByEmail(email)) {
            throw new CustomException(ErrorCode.DUPLICATE_EMAIL);
        }
        User user = new User(email, passwordEncoder.encode(request.password()), request.nickname().trim());
        return new SignupResponse(userRepository.save(user).getId());
    }

    // 로그인: 같은 clientType이면 기존 Refresh Token 교체
    @Transactional
    public TokenResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(normalizeEmail(request.email()))
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new CustomException(ErrorCode.INVALID_PASSWORD);
        }
        return issueTokens(user, request.clientType());
    }

    // 토큰 재발급: Refresh Token도 새로 교체(rotation)
    @Transactional
    public TokenResponse reissue(ReissueRequest request) {
        Long userId;
        try {
            userId = jwtProvider.getUserIdFromRefreshToken(request.refreshToken());
        } catch (ExpiredJwtException e) {
            throw new CustomException(ErrorCode.EXPIRED_REFRESH_TOKEN);
        } catch (JwtException | IllegalArgumentException e) {
            throw new CustomException(ErrorCode.INVALID_REFRESH_TOKEN);
        }

        RefreshToken saved = refreshTokenRepository.findByUserIdAndClientType(userId, request.clientType())
                .orElseThrow(() -> new CustomException(ErrorCode.INVALID_REFRESH_TOKEN)); // 로그아웃된 경우 등

        if (!saved.getToken().equals(request.refreshToken())) {
            throw new CustomException(ErrorCode.INVALID_REFRESH_TOKEN); // 이미 교체된 옛 토큰
        }
        if (saved.isExpired()) {
            throw new CustomException(ErrorCode.EXPIRED_REFRESH_TOKEN);
        }
        return issueTokens(saved.getUser(), request.clientType());
    }

    // 로그아웃: 해당 clientType의 Refresh Token만 삭제
    @Transactional
    public void logout(Long userId, LogoutRequest request) {
        refreshTokenRepository.deleteByUserIdAndClientType(userId, request.clientType());
    }

    private TokenResponse issueTokens(User user, ClientType clientType) {
        String accessToken = jwtProvider.createAccessToken(user.getId());
        String refreshToken = jwtProvider.createRefreshToken(user.getId());

        refreshTokenRepository.findByUserIdAndClientType(user.getId(), clientType)
                .ifPresentOrElse(
                        rt -> rt.rotate(refreshToken, jwtProvider.refreshTokenExpiredDate()),
                        () -> refreshTokenRepository.save(
                                new RefreshToken(user, clientType, refreshToken, jwtProvider.refreshTokenExpiredDate()))
                );

        return new TokenResponse(accessToken, refreshToken, jwtProvider.getAccessExpSeconds());
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
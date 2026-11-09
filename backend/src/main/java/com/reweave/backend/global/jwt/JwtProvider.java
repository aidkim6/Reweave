package com.reweave.backend.global.jwt;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;
import java.util.UUID;

@Component
public class JwtProvider {

    private static final String TYPE_CLAIM = "type";
    private static final String ACCESS = "access";
    private static final String REFRESH = "refresh";

    private final SecretKey key;
    private final long accessExpSeconds;
    private final long refreshExpSeconds;

    public JwtProvider(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.access-token-expiration-seconds}") long accessExpSeconds,
            @Value("${jwt.refresh-token-expiration-seconds}") long refreshExpSeconds
    ) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessExpSeconds = accessExpSeconds;
        this.refreshExpSeconds = refreshExpSeconds;
    }

    public String createAccessToken(Long userId) {
        return createToken(userId, ACCESS, accessExpSeconds);
    }

    public String createRefreshToken(Long userId) {
        return createToken(userId, REFRESH, refreshExpSeconds);
    }

    private String createToken(Long userId, String type, long expSeconds) {
        Date now = new Date();
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim(TYPE_CLAIM, type)
                .id(UUID.randomUUID().toString()) // 같은 초에 발급돼도 토큰 값이 달라지도록
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expSeconds * 1000))
                .signWith(key)
                .compact();
    }

    /** Access Token이 유효하면 userId, 아니면 null (필터용) */
    public Long getUserIdFromAccessToken(String token) {
        try {
            Claims claims = parse(token);
            if (!ACCESS.equals(claims.get(TYPE_CLAIM, String.class))) {
                return null;
            }
            return Long.valueOf(claims.getSubject());
        } catch (JwtException | IllegalArgumentException e) {
            return null;
        }
    }

    /**
     * Refresh Token 검증 후 userId 반환
     * @throws ExpiredJwtException 만료
     * @throws JwtException        위조·형식 오류·access 토큰을 보낸 경우
     */
    public Long getUserIdFromRefreshToken(String token) {
        Claims claims = parse(token);
        if (!REFRESH.equals(claims.get(TYPE_CLAIM, String.class))) {
            throw new JwtException("not a refresh token");
        }
        return Long.valueOf(claims.getSubject());
    }

    public LocalDateTime refreshTokenExpiredDate() {
        return LocalDateTime.now(ZoneId.systemDefault()).plusSeconds(refreshExpSeconds);
    }

    public long getAccessExpSeconds() {
        return accessExpSeconds;
    }

    private Claims parse(String token) {
        return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
    }
}
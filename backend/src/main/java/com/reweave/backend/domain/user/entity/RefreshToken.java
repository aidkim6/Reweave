package com.reweave.backend.domain.user.entity;

import com.reweave.backend.global.common.BaseTimeEntity;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "refresh_tokens",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_refresh_tokens_user_client",
                columnNames = {"user_id", "client_type"}
        )
)
public class RefreshToken extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "refresh_token_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "client_type", nullable = false, length = 20)
    private ClientType clientType;

    @Column(name = "token", nullable = false, length = 512)
    private String token;

    @Column(name = "expired_date", nullable = false)
    private LocalDateTime expiredDate;

    protected RefreshToken() {
    }

    public RefreshToken(User user, ClientType clientType, String token, LocalDateTime expiredDate) {
        this.user = user;
        this.clientType = clientType;
        this.token = token;
        this.expiredDate = expiredDate;
    }

    /** 같은 clientType으로 재로그인·재발급 시 토큰 교체 */
    public void rotate(String token, LocalDateTime expiredDate) {
        this.token = token;
        this.expiredDate = expiredDate;
    }

    public boolean isExpired() {
        return expiredDate.isBefore(LocalDateTime.now());
    }

    public Long getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public ClientType getClientType() {
        return clientType;
    }

    public String getToken() {
        return token;
    }

    public LocalDateTime getExpiredDate() {
        return expiredDate;
    }
}
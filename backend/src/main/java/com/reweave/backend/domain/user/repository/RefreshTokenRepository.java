package com.reweave.backend.domain.user.repository;

import com.reweave.backend.domain.user.entity.ClientType;
import com.reweave.backend.domain.user.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByUserIdAndClientType(Long userId, ClientType clientType);

    void deleteByUserIdAndClientType(Long userId, ClientType clientType);
}
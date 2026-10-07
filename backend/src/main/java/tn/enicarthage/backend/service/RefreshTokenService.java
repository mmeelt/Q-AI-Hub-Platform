package tn.enicarthage.backend.service;

import tn.enicarthage.backend.entity.RefreshToken;
import tn.enicarthage.backend.exception.TokenExpiredException;
import tn.enicarthage.backend.exception.TokenNotFoundException;
import tn.enicarthage.backend.exception.TokenRevokedException;
import tn.enicarthage.backend.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;

    @Value("${jwt.refresh.expiration}")
    private long refreshTokenDurationMs;

    @Transactional
    public RefreshToken createRefreshToken(String userId) {
        revokeAllUserTokens(userId);

        RefreshToken refreshToken = RefreshToken.builder()
                .userId(userId)
                .token(UUID.randomUUID().toString())
                .expiryDate(new Date(System.currentTimeMillis() + refreshTokenDurationMs))
                .isRevoked(false)
                .createdAt(new Date())
                .build();

        return refreshTokenRepository.save(refreshToken);
    }

    public RefreshToken verifyRefreshToken(String token) {
        RefreshToken refreshToken = refreshTokenRepository.findByToken(token)
                .orElseThrow(() -> new TokenNotFoundException("Refresh token is not in database"));

        if (refreshToken.getIsRevoked()) {
            throw new TokenRevokedException("Refresh token was revoked");
        }

        if (refreshToken.getExpiryDate().compareTo(new Date()) < 0) {
            refreshTokenRepository.delete(refreshToken);
            throw new TokenExpiredException("Refresh token expired. Please make a new signin request");
        }

        return refreshToken;
    }

    @Transactional
    public void revokeToken(String token) {
        refreshTokenRepository.findByToken(token).ifPresent(rt -> {
            rt.setIsRevoked(true);
            refreshTokenRepository.save(rt);
        });
    }

    @Transactional
    public void revokeAllUserTokens(String userId) {
        List<RefreshToken> tokens = refreshTokenRepository.findByUserId(userId);
        tokens.forEach(t -> t.setIsRevoked(true));
        refreshTokenRepository.saveAll(tokens);
    }
}

package tn.enicarthage.backend.security;

import tn.enicarthage.backend.entity.RevokedToken;
import tn.enicarthage.backend.repository.RevokedTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Date;

@Component
@RequiredArgsConstructor
@org.springframework.scheduling.annotation.EnableScheduling
public class JtiBlacklist {

    private final RevokedTokenRepository revokedTokenRepository;

    public void addToBlacklist(String jti) {
        if (jti != null && !revokedTokenRepository.existsById(jti)) {
            RevokedToken rt = RevokedToken.builder()
                    .jti(jti)
                    .revokedAt(new Date())
                    .build();
            revokedTokenRepository.save(rt);
        }
    }

    public boolean isBlacklisted(String jti) {
        return jti != null && revokedTokenRepository.existsById(jti);
    }

    @org.springframework.scheduling.annotation.Scheduled(cron = "0 0 3 * * *")
    public void cleanupExpiredTokens() {

        Date cutoff = new Date(System.currentTimeMillis() - 24 * 60 * 60 * 1000);
        revokedTokenRepository.deleteByRevokedAtBefore(cutoff);
    }
}

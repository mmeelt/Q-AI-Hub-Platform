package tn.enicarthage.backend.config;

import tn.enicarthage.backend.repository.OtpTokenRepository;
import tn.enicarthage.backend.repository.RevokedTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;

@Component
@RequiredArgsConstructor
@Slf4j
public class OtpCleanupTask {

    private final OtpTokenRepository otpTokenRepository;
    private final RevokedTokenRepository revokedTokenRepository;

    // Run every 10 minutes
    @Scheduled(fixedRate = 600000)
    @Transactional
    public void cleanExpiredOtps() {
        log.info("Starting scheduled cleanup of expired OTP tokens and JTIs...");
        // Expired codes are kept 30 minutes so the user can still click "Resend code" on that session
        Date expiredThreshold = new Date(System.currentTimeMillis() - 30L * 60 * 1000);
        otpTokenRepository.deleteByExpiryTimeBefore(expiredThreshold);
        
        // Clean revoked tokens older than 24 hours (assuming max token lifetime is < 24h)
        Date jtiThreshold = new Date(System.currentTimeMillis() - 24L * 60 * 60 * 1000);
        revokedTokenRepository.deleteByRevokedAtBefore(jtiThreshold);
        
        log.info("Cleanup of expired tokens completed.");
    }
}

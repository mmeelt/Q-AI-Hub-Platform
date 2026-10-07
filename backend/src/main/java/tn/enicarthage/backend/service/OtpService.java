package tn.enicarthage.backend.service;

import tn.enicarthage.backend.entity.Admin;
import tn.enicarthage.backend.entity.OtpToken;
import tn.enicarthage.backend.entity.User;
import tn.enicarthage.backend.exception.*;
import tn.enicarthage.backend.repository.AdminRepository;
import tn.enicarthage.backend.repository.OtpTokenRepository;
import tn.enicarthage.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Date;
import java.util.UUID;

/**
 * One-time 6-digit codes sent by email, for two purposes that never mix:
 *  - LOGIN: second step of the login (and email verification at sign-up);
 *  - PASSWORD_RESET: "Forgot password".
 * Codes are stored hashed, expire, allow a few attempts and can be used once.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class OtpService {

    private final OtpTokenRepository otpTokenRepository;
    private final UserRepository userRepository;
    private final AdminRepository adminRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;

    private final SecureRandom secureRandom = new SecureRandom();

    /** Temporary dev switch: every code is this fixed 6-digit value and no email is sent. */
    @Value("${otp.fixed.enabled:false}")
    private boolean fixedOtpEnabled;

    @Value("${otp.fixed.code:}")
    private String fixedOtpCode;

    @Value("${otp.expiry.minutes:5}")
    private int otpExpiryMinutes;

    @Value("${otp.max.attempts:3}")
    private int otpMaxAttempts;

    /** Login / email-verification code. */
    @Transactional
    public String generateAndSendOtp(String userId, String email, String fullName) {
        return generate(userId, email, fullName, OtpToken.LOGIN);
    }

    /** "Forgot password" code. */
    @Transactional
    public String generatePasswordResetCode(String userId, String email, String fullName) {
        return generate(userId, email, fullName, OtpToken.PASSWORD_RESET);
    }

    private String generate(String userId, String email, String fullName, String purpose) {
        // One pending code per account: a new request replaces the previous one
        otpTokenRepository.deleteByUserId(userId);

        boolean useFixedCode = fixedOtpEnabled && fixedOtpCode != null && fixedOtpCode.matches("^\\d{6}$");
        String rawCode = useFixedCode
                ? fixedOtpCode
                : String.format("%06d", secureRandom.nextInt(1_000_000));

        String otpSessionId = UUID.randomUUID().toString();
        otpTokenRepository.save(OtpToken.builder()
                .otpSessionId(otpSessionId)
                .userId(userId)
                .otpCode(passwordEncoder.encode(rawCode))
                .expiryTime(new Date(System.currentTimeMillis() + (long) otpExpiryMinutes * 60 * 1000))
                .isUsed(false)
                .attempts(0)
                .purpose(purpose)
                .createdAt(new Date())
                .build());

        // Sent synchronously: if delivery fails, the request fails too (and this transaction
        // rolls back) instead of the user waiting for a code that never arrives.
        if (useFixedCode) {
            log.warn("Fixed OTP mode is ON (otp.fixed.enabled): no email sent to {}. Disable it once SMTP is configured.", email);
        } else if (OtpToken.PASSWORD_RESET.equals(purpose)) {
            emailService.sendPasswordResetCodeNow(email, fullName, rawCode, otpExpiryMinutes);
            log.info("Password reset code generated for {} and sent to {}", userId, email);
        } else {
            emailService.sendOtpCodeNow(email, fullName, rawCode, otpExpiryMinutes);
            log.info("OTP generated for user {} and sent to {}", userId, email);
        }
        return otpSessionId;
    }

    /** Checks a login code and returns the account id. Reset codes are refused. */
    @Transactional
    public String validateOtp(String otpSessionId, String rawCode) {
        return validate(otpSessionId, rawCode, OtpToken.LOGIN);
    }

    /** Checks a password-reset code and returns the account id. Login codes are refused. */
    @Transactional
    public String validatePasswordResetCode(String sessionId, String rawCode) {
        return validate(sessionId, rawCode, OtpToken.PASSWORD_RESET);
    }

    private String validate(String otpSessionId, String rawCode, String expectedPurpose) {
        OtpToken otpToken = otpTokenRepository.findByOtpSessionId(otpSessionId)
                .orElseThrow(() -> new OtpNotFoundException("Invalid session"));

        String purpose = otpToken.getPurpose() == null ? OtpToken.LOGIN : otpToken.getPurpose();
        if (!purpose.equals(expectedPurpose)) {
            throw new OtpNotFoundException("Invalid session");
        }

        if (otpToken.getIsUsed()) {
            throw new OtpAlreadyUsedException("OTP already used");
        }

        if (otpToken.getExpiryTime().before(new Date())) {
            otpTokenRepository.delete(otpToken);
            throw new OtpExpiredException("OTP expired");
        }

        int attempts = otpToken.getAttempts() + 1;
        otpToken.setAttempts(attempts);
        otpTokenRepository.save(otpToken);

        if (attempts > otpMaxAttempts) {
            otpTokenRepository.delete(otpToken);
            throw new OtpMaxAttemptsException("Maximum OTP attempts exceeded. Request a new code.");
        }

        if (!passwordEncoder.matches(rawCode, otpToken.getOtpCode())) {
            throw new OtpInvalidException("Invalid OTP code", otpMaxAttempts - attempts);
        }

        otpToken.setIsUsed(true);
        otpTokenRepository.save(otpToken);

        return otpToken.getUserId();
    }

    @Transactional
    public String resendOtp(String otpSessionId) {
        OtpToken existing = otpTokenRepository.findByOtpSessionId(otpSessionId)
                .orElseThrow(() -> new OtpNotFoundException("Invalid session"));

        String accountId = existing.getUserId();
        // The new code keeps the purpose of the one it replaces
        String purpose = existing.getPurpose() == null ? OtpToken.LOGIN : existing.getPurpose();

        // Delete old token and generate a new one
        otpTokenRepository.delete(existing);

        // The id stored in OtpToken can belong to either a User or an Admin.
        User user = userRepository.findById(accountId).orElse(null);
        if (user != null) {
            return generate(user.getUserId(), user.getEmailAddress(), user.getFullName(), purpose);
        }

        Admin admin = adminRepository.findById(accountId).orElse(null);
        if (admin != null) {
            return generate(admin.getAdminId(), admin.getAdminEmail(), admin.getAdminName(), purpose);
        }

        // No matching account — refuse rather than send an email to an opaque id.
        throw new OtpNotFoundException("Cannot resend OTP: no matching account found");
    }
}

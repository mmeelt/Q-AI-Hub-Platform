package tn.enicarthage.backend.service;

import tn.enicarthage.backend.dto.*;
import tn.enicarthage.backend.entity.InvitationLog;
import tn.enicarthage.backend.entity.RefreshToken;
import tn.enicarthage.backend.entity.User;
import tn.enicarthage.backend.exception.*;
import tn.enicarthage.backend.repository.InvitationLogRepository;
import tn.enicarthage.backend.repository.UserRepository;
import tn.enicarthage.backend.security.InputSanitizer;
import tn.enicarthage.backend.security.JtiBlacklist;
import tn.enicarthage.backend.security.JwtUtil;
import tn.enicarthage.backend.security.PasswordValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;

import java.util.Date;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@lombok.extern.slf4j.Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final RefreshTokenService refreshTokenService;
    private final OtpService otpService;
    private final InputSanitizer inputSanitizer;
    private final PasswordValidator passwordValidator;
    private final JtiBlacklist jtiBlacklist;
    private final InvitationLogRepository invitationLogRepository;
    private final tn.enicarthage.backend.repository.AdminRepository adminRepository;
    private final tn.enicarthage.backend.repository.EventRepository eventRepository;
    private final NotificationService notificationService;
    private final PlatformSettingService platformSettings;
    private final EmailService emailService;

    @Value("${jwt.expiration}")
    private long accessTokenTtlMs;

    @Transactional
    public LoginPendingResponse register(RegisterRequest dto) {
        String cleanEmail = inputSanitizer.sanitizeEmail(dto.getEmail());
        log.info("Register attempt for email: {}", cleanEmail);
        passwordValidator.validate(dto.getPassword());

        // Also reject admin emails: login checks users first, so a user with an admin's email
        // would shadow the admin account.
        if (userRepository.findByEmailAddress(cleanEmail).isPresent()
                || adminRepository.findByAdminEmail(cleanEmail).isPresent()) {
            log.warn("Register rejected: email already exists for {}", cleanEmail);
            throw new EmailAlreadyExistsException("Email already exists");
        }

        boolean invited = dto.getInviteToken() != null && !dto.getInviteToken().isBlank();
        if (!invited && !platformSettings.publicRegistrationsAllowed()) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Registrations are currently closed. You need an invitation to create an account.");
        }

        User.ExpertRole assignedExpertRole = null;
        InvitationLog invitationToConsume = null;

        if (dto.getInviteToken() != null && !dto.getInviteToken().isBlank()) {
            String token = dto.getInviteToken().trim();
            InvitationLog inv = invitationLogRepository.findById(token)
                    .orElseThrow(() -> new InvalidInvitationException("Invalid or unknown invitation"));
            if (inv.getConsumedAt() != null) {
                throw new InvalidInvitationException("Invitation has already been used");
            }
            String invitedEmail = inputSanitizer.sanitizeEmail(inv.getEmail());
            if (!cleanEmail.equalsIgnoreCase(invitedEmail)) {
                throw new InvalidInvitationException("Email does not match this invitation");
            }
            // Participant invitations give no expert role; expert invitations do
            assignedExpertRole = ExpertInvitationService.PARTICIPANT.equals(inv.getExpertRole())
                    ? null : parseExpertRole(inv.getExpertRole());
            invitationToConsume = inv;
        }

        User.UserBuilder userBuilder = User.builder()
                .userId(UUID.randomUUID().toString())
                .emailAddress(cleanEmail)
                .passwordHash(passwordEncoder.encode(dto.getPassword()))
                .fullName(inputSanitizer.sanitize(dto.getFullName()))
                .universityName(inputSanitizer.sanitize(dto.getUniversityName()))
                .accountCreatedAt(new Date())
                .userStatus(User.UserStatus.ACTIVE)
                .failedLoginAttempts(0)
                .accountLocked(false);
        if (assignedExpertRole != null) {
            userBuilder.expertRole(assignedExpertRole);
        }

        User user = userBuilder.build();

        userRepository.save(user);

        if (invitationToConsume != null) {
            invitationToConsume.setConsumedAt(new Date());
            invitationLogRepository.save(invitationToConsume);

            // Link to event if invitation had eventId
            if (invitationToConsume.getEventId() != null) {
                String eventId = invitationToConsume.getEventId();
                String expertEmail = invitationToConsume.getEmail();
                String expertRole = invitationToConsume.getExpertRole();

                eventRepository.findById(eventId).ifPresent(event -> {
                    if (event.getExpertInvitations() == null) {
                        event.setExpertInvitations(new java.util.ArrayList<>());
                    }
                    boolean exists = event.getExpertInvitations().stream()
                            .anyMatch(ei -> ei.getEmail().equalsIgnoreCase(expertEmail));
                    if (!exists) {
                        event.getExpertInvitations().add(new tn.enicarthage.backend.entity.Event.ExpertInvite(
                                expertEmail, expertRole, java.time.LocalDateTime.now()));
                        eventRepository.save(event);
                    }

                    // The account did not exist when the admin assigned the expert, so notify now
                    try {
                        notificationService.createNotification(
                                user.getUserId(),
                                "Expert Role Assigned",
                                "You have been assigned as " + expertRole + " to review applications for "
                                        + event.getTitle() + ".",
                                "ROLE_UPDATE",
                                "/expert/event/" + event.getEventId());
                    } catch (Exception e) {
                        log.error("Failed to create expert notification", e);
                    }
                });
            }
        }

        log.info("Register OK: user {} created with id {}", cleanEmail, user.getUserId());

        String otpSessionId = otpService.generateAndSendOtp(user.getUserId(), user.getEmailAddress(), user.getFullName());

        return LoginPendingResponse.builder()
                .requiresOtp(true)
                .otpSessionId(otpSessionId)
                .message("Account created. Please verify your email with the OTP sent.")
                .expiresIn(300)
                .build();
    }

    @Transactional
    public LoginPendingResponse login(LoginRequest dto) {
        String cleanEmail = inputSanitizer.sanitizeEmail(dto.getEmail());
        log.info("Login attempt for email: {}", cleanEmail);

        // Try to find in User repository first
        var userOpt = userRepository.findByEmailAddress(cleanEmail);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            log.info("User found: {}", user.getEmailAddress());

            if (user.getAccountLocked() != null && user.getAccountLocked()) {
                if (user.getLockoutEndTime() != null && user.getLockoutEndTime().after(new Date())) {
                    throw new AccountLockedException("Account locked until " + user.getLockoutEndTime());
                } else {
                    user.setFailedLoginAttempts(0);
                    user.setAccountLocked(false);
                    user.setLockoutEndTime(null);
                    userRepository.save(user);
                }
            }

            boolean matches = passwordEncoder.matches(dto.getPassword(), user.getPasswordHash());
            log.info("Password match for user: {}", matches);

            if (!matches) {
                int attempts = user.getFailedLoginAttempts() == null ? 0 : user.getFailedLoginAttempts();
                attempts++;
                user.setFailedLoginAttempts(attempts);
                if (attempts >= 5) {
                    user.setAccountLocked(true);
                    user.setLockoutEndTime(new Date(System.currentTimeMillis() + 15 * 60 * 1000));
                }
                userRepository.save(user);
                throw new InvalidCredentialsException("Invalid email or password");
            }

            user.setFailedLoginAttempts(0);
            user.setAccountLocked(false);
            user.setLockoutEndTime(null);
            userRepository.save(user);

            // "Require email verification" off: users who already verified their email skip the code
            if (!platformSettings.emailCodeAtEveryLogin() && Boolean.TRUE.equals(user.getEmailVerified())) {
                return LoginPendingResponse.builder()
                        .requiresOtp(false)
                        .message("Logged in")
                        .session(issueUserSession(user))
                        .build();
            }

            String otpSessionId = otpService.generateAndSendOtp(user.getUserId(), user.getEmailAddress(),
                    user.getFullName());
            return LoginPendingResponse.builder()
                    .requiresOtp(true)
                    .otpSessionId(otpSessionId)
                    .message("OTP sent to your email")
                    .expiresIn(300)
                    .build();
        }

        // Try to find in Admin repository
        var adminOpt = adminRepository.findByAdminEmail(cleanEmail);
        if (adminOpt.isPresent()) {
            tn.enicarthage.backend.entity.Admin admin = adminOpt.get();
            log.info("Admin found: {}", admin.getAdminEmail());

            boolean matches = passwordEncoder.matches(dto.getPassword(), admin.getPasswordHash());
            log.info("Password match for admin: {}", matches);

            if (!matches) {
                throw new InvalidCredentialsException("Invalid email or password");
            }

            String otpSessionId = otpService.generateAndSendOtp(admin.getAdminId(), admin.getAdminEmail(),
                    admin.getAdminName());
            return LoginPendingResponse.builder()
                    .requiresOtp(true)
                    .otpSessionId(otpSessionId)
                    .message("Admin OTP sent to your email")
                    .expiresIn(300)
                    .build();
        }

        log.warn("No user or admin found for: {}", cleanEmail);
        throw new InvalidCredentialsException("Invalid email or password");
    }

    @Transactional
    public String resendOtp(String otpSessionId) {
        return otpService.resendOtp(otpSessionId);
    }

    @Transactional
    public AuthResponse verifyOtpAndLogin(VerifyOtpRequest dto) {
        String userId = otpService.validateOtp(dto.getOtpSessionId(), dto.getOtpCode());

        // Check User first
        var userOpt = userRepository.findById(userId);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            user.setFailedLoginAttempts(0);
            user.setEmailVerified(true); // the code proves they own the address
            userRepository.save(user);
            return issueUserSession(user);
        }

        // Check Admin
        var adminOpt = adminRepository.findById(userId);
        if (adminOpt.isPresent()) {
            tn.enicarthage.backend.entity.Admin admin = adminOpt.get();
            admin.setLastSignInAt(new Date()); // shown in Settings > Administrators
            adminRepository.save(admin);
            String role = "ADMIN";
            String token = jwtUtil.generateToken(admin.getAdminId(), admin.getAdminEmail(), role);
            RefreshToken rt = refreshTokenService.createRefreshToken(admin.getAdminId());

            return new AuthResponse(token, rt.getToken(), accessTokenTtlMs / 1000, admin.getAdminId(),
                    admin.getAdminEmail(), role, admin.getAdminName());
        }

        throw new ResourceNotFoundException("User or Admin not found");
    }

    // BUG 3 FIX: also handle Admin refresh tokens (previously crashed with "User
    // not found")
    public AuthResponse refreshAccessToken(String refreshTokenStr) {
        RefreshToken rt = refreshTokenService.verifyRefreshToken(refreshTokenStr);

        var userOpt = userRepository.findById(rt.getUserId());
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            String role = user.getExpertRole() != null ? user.getExpertRole().name() : "USER";
            String newAccessToken = jwtUtil.generateToken(user.getUserId(), user.getEmailAddress(), role);
            return new AuthResponse(newAccessToken, rt.getToken(), accessTokenTtlMs / 1000, user.getUserId(),
                    user.getEmailAddress(), role, user.getFullName());
        }

        var adminOpt = adminRepository.findById(rt.getUserId());
        if (adminOpt.isPresent()) {
            tn.enicarthage.backend.entity.Admin admin = adminOpt.get();
            String newAccessToken = jwtUtil.generateToken(admin.getAdminId(), admin.getAdminEmail(), "ADMIN");
            return new AuthResponse(newAccessToken, rt.getToken(), accessTokenTtlMs / 1000, admin.getAdminId(),
                    admin.getAdminEmail(), "ADMIN", admin.getAdminName());
        }

        // the account was deleted: the session ends (401), it is not a "not found" resource
        refreshTokenService.revokeAllUserTokens(rt.getUserId());
        throw new tn.enicarthage.backend.exception.TokenRevokedException("This account no longer exists");
    }

    private AuthResponse issueUserSession(User user) {
        String role = user.getExpertRole() != null ? user.getExpertRole().name() : "USER";
        String token = jwtUtil.generateToken(user.getUserId(), user.getEmailAddress(), role);
        RefreshToken rt = refreshTokenService.createRefreshToken(user.getUserId());
        return new AuthResponse(token, rt.getToken(), accessTokenTtlMs / 1000, user.getUserId(),
                user.getEmailAddress(), role, user.getFullName());
    }

    public Boolean logout(String accessToken, String refreshToken) {
        if (refreshToken != null) {
            refreshTokenService.revokeToken(refreshToken);
        }
        if (accessToken != null) {
            String jti = jwtUtil.extractJti(accessToken);
            if (jti != null)
                jtiBlacklist.addToBlacklist(jti);
        }
        return true;
    }

    // ── Forgot password ───────────────────────────────────────────

    /**
     * Emails a reset code when the address belongs to a user or an admin. The response is the same
     * either way (a session id), so the form cannot be used to find out which emails have accounts.
     */
    @Transactional
    public String requestPasswordReset(String email) {
        String cleanEmail = inputSanitizer.sanitizeEmail(email);
        var user = userRepository.findByEmailAddress(cleanEmail);
        if (user.isPresent()) {
            return otpService.generatePasswordResetCode(user.get().getUserId(), user.get().getEmailAddress(), user.get().getFullName());
        }
        var admin = adminRepository.findByAdminEmail(cleanEmail);
        if (admin.isPresent()) {
            return otpService.generatePasswordResetCode(admin.get().getAdminId(), admin.get().getAdminEmail(), admin.get().getAdminName());
        }
        log.info("Password reset requested for unknown email {}", cleanEmail);
        return UUID.randomUUID().toString(); // looks like a real session; any code will be refused
    }

    /**
     * Sets a new password after checking the emailed reset code, then signs the account out
     * everywhere and sends a security notice.
     */
    @Transactional
    public void resetPassword(String resetSessionId, String code, String newPassword) {
        passwordValidator.validate(newPassword);
        String accountId = otpService.validatePasswordResetCode(resetSessionId, code);

        var user = userRepository.findById(accountId);
        if (user.isPresent()) {
            User u = user.get();
            u.setPasswordHash(passwordEncoder.encode(newPassword));
            u.setFailedLoginAttempts(0);
            u.setAccountLocked(false);   // a locked-out user can get back in
            u.setLockoutEndTime(null);
            u.setEmailVerified(true);    // the code proves they own the address
            userRepository.save(u);
            refreshTokenService.revokeAllUserTokens(u.getUserId());
            emailService.sendPasswordChangedNotice(u.getEmailAddress(), u.getFullName());
            return;
        }
        var admin = adminRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
        admin.setPasswordHash(passwordEncoder.encode(newPassword));
        adminRepository.save(admin);
        refreshTokenService.revokeAllUserTokens(admin.getAdminId());
        emailService.sendPasswordChangedNotice(admin.getAdminEmail(), admin.getAdminName());
    }

    /**
     * Changes the password of the logged-in user OR admin, signs the account out on every other
     * device and sends a security notice. The caller re-issues the current session (see issueSession).
     */
    @Transactional
    public Boolean changePassword(String accountId, String oldPass, String newPass) {
        var user = userRepository.findById(accountId);
        if (user.isPresent()) {
            User u = user.get();
            checkCurrentAndNew(oldPass, newPass, u.getPasswordHash());
            u.setPasswordHash(passwordEncoder.encode(newPass));
            userRepository.save(u);
            refreshTokenService.revokeAllUserTokens(accountId);
            emailService.sendPasswordChangedNotice(u.getEmailAddress(), u.getFullName());
            return true;
        }
        var admin = adminRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
        checkCurrentAndNew(oldPass, newPass, admin.getPasswordHash());
        admin.setPasswordHash(passwordEncoder.encode(newPass));
        adminRepository.save(admin);
        refreshTokenService.revokeAllUserTokens(accountId);
        emailService.sendPasswordChangedNotice(admin.getAdminEmail(), admin.getAdminName());
        return true;
    }

    private void checkCurrentAndNew(String oldPass, String newPass, String currentHash) {
        if (oldPass == null || !passwordEncoder.matches(oldPass, currentHash)) {
            throw new tn.enicarthage.backend.exception.WrongCurrentPasswordException("Your current password is incorrect");
        }
        passwordValidator.validate(newPass);
        if (passwordEncoder.matches(newPass, currentHash)) {
            throw new PasswordWeakException("The new password must be different from the current one");
        }
    }

    /** A fresh session (tokens) for an account, e.g. to keep the current device logged in after a password change. */
    public AuthResponse issueSession(String accountId) {
        var user = userRepository.findById(accountId);
        if (user.isPresent()) {
            return issueUserSession(user.get());
        }
        var admin = adminRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
        String token = jwtUtil.generateToken(admin.getAdminId(), admin.getAdminEmail(), "ADMIN");
        RefreshToken rt = refreshTokenService.createRefreshToken(admin.getAdminId());
        return new AuthResponse(token, rt.getToken(), accessTokenTtlMs / 1000, admin.getAdminId(),
                admin.getAdminEmail(), "ADMIN", admin.getAdminName());
    }

    private User.ExpertRole parseExpertRole(String raw) {
        try {
            return User.ExpertRole.fromLabel(raw);
        } catch (IllegalArgumentException e) {
            throw new InvalidInvitationException("Invalid expert role on invitation");
        }
    }
}

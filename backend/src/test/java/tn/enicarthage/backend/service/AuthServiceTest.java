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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Date;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtUtil jwtUtil;
    @Mock private RefreshTokenService refreshTokenService;
    @Mock private OtpService otpService;
    @Mock private InputSanitizer inputSanitizer;
    @Mock private PasswordValidator passwordValidator;
    @Mock private JtiBlacklist jtiBlacklist;
    @Mock private InvitationLogRepository invitationLogRepository;
    @Mock private tn.enicarthage.backend.repository.AdminRepository adminRepository;
    @Mock private tn.enicarthage.backend.repository.EventRepository eventRepository;
    @Mock private NotificationService notificationService;
    @Mock private PlatformSettingService platformSettings;
    @Mock private EmailService emailService;

    @InjectMocks
    private AuthService authService;

    private User testUser;
    private RefreshToken testRt;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .userId("user-1")
                .emailAddress("test@example.com")
                .passwordHash("hashed-password")
                .failedLoginAttempts(0)
                .accountLocked(false)
                .build();

        testRt = RefreshToken.builder()
                .token("refresh-123")
                .userId("user-1")
                .build();
    }

    @Test
    void register_success() {
        RegisterRequest req = new RegisterRequest();
        req.setEmail("test@example.com");
        req.setPassword("ValidPass1!");
        req.setFullName("Test User");
        req.setUniversityName("Uni");

        when(platformSettings.publicRegistrationsAllowed()).thenReturn(true);
        when(inputSanitizer.sanitizeEmail(any())).thenReturn("test@example.com");
        when(inputSanitizer.sanitize(any())).thenReturn("Clean String");
        when(userRepository.findByEmailAddress("test@example.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(any())).thenReturn("hashed-pass");
        when(otpService.generateAndSendOtp(any(), eq("test@example.com"), any())).thenReturn("otp-session");

        // Registration does not log in directly: the email must be verified with an OTP first
        tn.enicarthage.backend.dto.LoginPendingResponse res = authService.register(req);

        assertNotNull(res);
        assertTrue(res.getRequiresOtp());
        assertEquals("otp-session", res.getOtpSessionId());
        verify(userRepository).save(any(User.class));
        verify(jwtUtil, never()).generateToken(any(), any(), any());
        verify(invitationLogRepository, never()).findById(anyString());
    }

    @Test
    void register_withValidInvite_setsExpertRoleAndConsumesInvitation() {
        String invId = UUID.randomUUID().toString();
        RegisterRequest req = new RegisterRequest();
        req.setEmail("expert@test.com");
        req.setPassword("ValidPass1!");
        req.setFullName("Expert");
        req.setUniversityName("Uni");
        req.setInviteToken(invId);

        InvitationLog inv = InvitationLog.builder()
                .invitationId(invId)
                .email("expert@test.com")
                .expertRole("MENTOR")
                .invitedAt(new Date())
                .build();

        when(inputSanitizer.sanitizeEmail(any())).thenAnswer(a -> a.getArgument(0));
        when(invitationLogRepository.findById(invId)).thenReturn(Optional.of(inv));
        when(userRepository.findByEmailAddress("expert@test.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(any())).thenReturn("hashed-pass");
        when(otpService.generateAndSendOtp(any(), eq("expert@test.com"), any())).thenReturn("otp-session");

        tn.enicarthage.backend.dto.LoginPendingResponse res = authService.register(req);

        assertNotNull(res);
        assertNotNull(inv.getConsumedAt());
        verify(invitationLogRepository).save(inv);
        verify(userRepository).save(argThat(u -> u.getExpertRole() == User.ExpertRole.MENTOR));
    }

    @Test
    void register_withParticipantInvite_givesNoExpertRole_evenWhenRegistrationsAreClosed() {
        String invId = UUID.randomUUID().toString();
        RegisterRequest req = new RegisterRequest();
        req.setEmail("founder@test.com");
        req.setPassword("ValidPass1!");
        req.setFullName("Founder");
        req.setUniversityName("Uni");
        req.setInviteToken(invId);
        InvitationLog inv = InvitationLog.builder().invitationId(invId).email("founder@test.com")
                .expertRole(ExpertInvitationService.PARTICIPANT).invitedAt(new Date()).build();

        when(inputSanitizer.sanitizeEmail(any())).thenAnswer(a -> a.getArgument(0));
        when(invitationLogRepository.findById(invId)).thenReturn(Optional.of(inv));
        when(userRepository.findByEmailAddress("founder@test.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(any())).thenReturn("hashed-pass");
        when(otpService.generateAndSendOtp(any(), eq("founder@test.com"), any())).thenReturn("otp-session");

        authService.register(req);

        verify(userRepository).save(argThat(u -> u.getExpertRole() == null));
        assertNotNull(inv.getConsumedAt());
        verify(platformSettings, never()).publicRegistrationsAllowed(); // invitation bypasses the setting
    }

    @Test
    void register_withUnknownInvite_throws() {
        RegisterRequest req = new RegisterRequest();
        req.setEmail("x@test.com");
        req.setPassword("ValidPass1!");
        req.setFullName("X");
        req.setUniversityName("U");
        req.setInviteToken("missing");

        when(inputSanitizer.sanitizeEmail(any())).thenAnswer(a -> a.getArgument(0));
        when(invitationLogRepository.findById("missing")).thenReturn(Optional.empty());
        when(userRepository.findByEmailAddress("x@test.com")).thenReturn(Optional.empty());

        assertThrows(InvalidInvitationException.class, () -> authService.register(req));
        verify(userRepository, never()).save(any());
    }

    @Test
    void register_emailDoesNotMatchInvite_throws() {
        String invId = UUID.randomUUID().toString();
        RegisterRequest req = new RegisterRequest();
        req.setEmail("other@test.com");
        req.setPassword("ValidPass1!");
        req.setFullName("X");
        req.setUniversityName("U");
        req.setInviteToken(invId);

        InvitationLog inv = InvitationLog.builder()
                .invitationId(invId)
                .email("expert@test.com")
                .expertRole("MENTOR")
                .invitedAt(new Date())
                .build();

        when(inputSanitizer.sanitizeEmail(any())).thenAnswer(a -> a.getArgument(0));
        when(invitationLogRepository.findById(invId)).thenReturn(Optional.of(inv));
        when(userRepository.findByEmailAddress("other@test.com")).thenReturn(Optional.empty());

        assertThrows(InvalidInvitationException.class, () -> authService.register(req));
        verify(userRepository, never()).save(any());
    }

    @Test
    void register_consumedInvite_throws() {
        String invId = UUID.randomUUID().toString();
        RegisterRequest req = new RegisterRequest();
        req.setEmail("expert@test.com");
        req.setPassword("ValidPass1!");
        req.setFullName("X");
        req.setUniversityName("U");
        req.setInviteToken(invId);

        InvitationLog inv = InvitationLog.builder()
                .invitationId(invId)
                .email("expert@test.com")
                .expertRole("MENTOR")
                .invitedAt(new Date())
                .consumedAt(new Date())
                .build();

        when(inputSanitizer.sanitizeEmail(any())).thenAnswer(a -> a.getArgument(0));
        when(invitationLogRepository.findById(invId)).thenReturn(Optional.of(inv));
        when(userRepository.findByEmailAddress("expert@test.com")).thenReturn(Optional.empty());

        assertThrows(InvalidInvitationException.class, () -> authService.register(req));
    }

    @Test
    void login_success_generatesOtp() {
        LoginRequest req = new LoginRequest();
        req.setEmail("test@example.com");
        req.setPassword("ValidPass1!");

        when(inputSanitizer.sanitizeEmail(any())).thenReturn("test@example.com");
        when(userRepository.findByEmailAddress("test@example.com")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("ValidPass1!", "hashed-password")).thenReturn(true);
        when(platformSettings.emailCodeAtEveryLogin()).thenReturn(true);
        when(otpService.generateAndSendOtp(eq("user-1"), eq("test@example.com"), any())).thenReturn("session-123");

        LoginPendingResponse res = authService.login(req);

        assertTrue(res.getRequiresOtp());
        assertEquals("session-123", res.getOtpSessionId());
        assertNull(res.getSession());
    }

    // ── Platform settings ─────────────────────────────────────────

    @Test
    void register_whenRegistrationsClosed_withoutInvite_isRefused() {
        RegisterRequest req = new RegisterRequest();
        req.setEmail("new@test.com");
        req.setPassword("ValidPass1!");
        when(inputSanitizer.sanitizeEmail(any())).thenReturn("new@test.com");
        when(userRepository.findByEmailAddress("new@test.com")).thenReturn(Optional.empty());
        when(platformSettings.publicRegistrationsAllowed()).thenReturn(false);

        assertThrows(org.springframework.security.access.AccessDeniedException.class, () -> authService.register(req));
        verify(userRepository, never()).save(any());
    }

    @Test
    void login_verifiedUser_whenCodeNotRequiredAtEveryLogin_opensSessionDirectly() {
        testUser.setEmailVerified(true);
        LoginRequest req = new LoginRequest();
        req.setEmail("test@example.com");
        req.setPassword("ValidPass1!");
        when(inputSanitizer.sanitizeEmail(any())).thenReturn("test@example.com");
        when(userRepository.findByEmailAddress("test@example.com")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("ValidPass1!", "hashed-password")).thenReturn(true);
        when(platformSettings.emailCodeAtEveryLogin()).thenReturn(false);
        when(jwtUtil.generateToken("user-1", "test@example.com", "USER")).thenReturn("access-token");
        when(refreshTokenService.createRefreshToken("user-1")).thenReturn(testRt);

        LoginPendingResponse res = authService.login(req);

        assertFalse(res.getRequiresOtp());
        assertEquals("access-token", res.getSession().getAccessToken());
        verify(otpService, never()).generateAndSendOtp(any(), any(), any());
    }

    @Test
    void login_unverifiedUser_stillGetsACode_evenWhenCodeNotRequiredAtEveryLogin() {
        // registered but never entered the code: the email is not proven yet
        LoginRequest req = new LoginRequest();
        req.setEmail("test@example.com");
        req.setPassword("ValidPass1!");
        when(inputSanitizer.sanitizeEmail(any())).thenReturn("test@example.com");
        when(userRepository.findByEmailAddress("test@example.com")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("ValidPass1!", "hashed-password")).thenReturn(true);
        when(platformSettings.emailCodeAtEveryLogin()).thenReturn(false);
        when(otpService.generateAndSendOtp(eq("user-1"), eq("test@example.com"), any())).thenReturn("session-123");

        LoginPendingResponse res = authService.login(req);

        assertTrue(res.getRequiresOtp());
        assertNull(res.getSession());
    }

    @Test
    void verifyOtp_marksTheEmailAsVerified() {
        VerifyOtpRequest req = new VerifyOtpRequest();
        req.setOtpSessionId("session-123");
        req.setOtpCode("123456");
        when(otpService.validateOtp("session-123", "123456")).thenReturn("user-1");
        when(userRepository.findById("user-1")).thenReturn(Optional.of(testUser));
        when(jwtUtil.generateToken(any(), any(), any())).thenReturn("access-token");
        when(refreshTokenService.createRefreshToken("user-1")).thenReturn(testRt);

        authService.verifyOtpAndLogin(req);

        assertTrue(testUser.getEmailVerified());
    }

    @Test
    void login_wrongPassword_incrementsAttempts() {
        LoginRequest req = new LoginRequest();
        req.setEmail("test@example.com");
        req.setPassword("WrongPass!");

        when(inputSanitizer.sanitizeEmail(any())).thenReturn("test@example.com");
        when(userRepository.findByEmailAddress("test@example.com")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("WrongPass!", "hashed-password")).thenReturn(false);

        assertThrows(InvalidCredentialsException.class, () -> authService.login(req));

        assertEquals(1, testUser.getFailedLoginAttempts());
        verify(userRepository).save(testUser);
    }

    @Test
    void login_locksAccountAfterMaxAttempts() {
        testUser.setFailedLoginAttempts(4);
        LoginRequest req = new LoginRequest();
        req.setEmail("test@example.com");
        req.setPassword("WrongPass!");

        when(inputSanitizer.sanitizeEmail(any())).thenReturn("test@example.com");
        when(userRepository.findByEmailAddress("test@example.com")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("WrongPass!", "hashed-password")).thenReturn(false);

        assertThrows(InvalidCredentialsException.class, () -> authService.login(req));

        assertEquals(5, testUser.getFailedLoginAttempts());
        assertTrue(testUser.getAccountLocked());
        assertNotNull(testUser.getLockoutEndTime());
        verify(userRepository).save(testUser);
    }

    @Test
    void login_accountLocked_throwsException() {
        testUser.setAccountLocked(true);
        testUser.setLockoutEndTime(new Date(System.currentTimeMillis() + 60000)); // Future

        LoginRequest req = new LoginRequest();
        req.setEmail("test@example.com");

        when(inputSanitizer.sanitizeEmail(any())).thenReturn("test@example.com");
        when(userRepository.findByEmailAddress("test@example.com")).thenReturn(Optional.of(testUser));

        assertThrows(AccountLockedException.class, () -> authService.login(req));
    }

    @Test
    void verifyOtpAndLogin_success() {
        VerifyOtpRequest req = new VerifyOtpRequest();
        req.setOtpSessionId("session-123");
        req.setOtpCode("123456");

        when(otpService.validateOtp("session-123", "123456")).thenReturn("user-1");
        when(userRepository.findById("user-1")).thenReturn(Optional.of(testUser));
        when(jwtUtil.generateToken("user-1", "test@example.com", "USER")).thenReturn("access-token");
        when(refreshTokenService.createRefreshToken("user-1")).thenReturn(testRt);

        AuthResponse res = authService.verifyOtpAndLogin(req);

        assertEquals("access-token", res.getAccessToken());
        assertEquals("refresh-123", res.getRefreshToken());
    }

    @Test
    void changePassword_success() {
        when(userRepository.findById("user-1")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("old-pass", "hashed-password")).thenReturn(true);
        when(passwordEncoder.encode("new-pass")).thenReturn("new-hashed");

        assertTrue(authService.changePassword("user-1", "old-pass", "new-pass"));

        assertEquals("new-hashed", testUser.getPasswordHash());
        verify(userRepository).save(testUser);
    }

    @Test
    void logout_success_blacklistsToken() {
        when(jwtUtil.extractJti("access-token")).thenReturn("jti-123");

        assertTrue(authService.logout("access-token", "refresh-token"));

        verify(refreshTokenService).revokeToken("refresh-token");
        verify(jtiBlacklist).addToBlacklist("jti-123");
    }

    // ── Forgot password ───────────────────────────────────────────

    @Test
    void forgotPassword_unknownEmail_looksTheSame_butSendsNothing() {
        when(inputSanitizer.sanitizeEmail(any())).thenReturn("nobody@test.com");
        when(userRepository.findByEmailAddress("nobody@test.com")).thenReturn(Optional.empty());
        when(adminRepository.findByAdminEmail("nobody@test.com")).thenReturn(Optional.empty());

        String sessionId = authService.requestPasswordReset("nobody@test.com");

        assertNotNull(sessionId); // same shape of answer as for a real account
        verify(otpService, never()).generatePasswordResetCode(any(), any(), any());
    }

    @Test
    void forgotPassword_knownUser_emailsAResetCode() {
        when(inputSanitizer.sanitizeEmail(any())).thenReturn("test@example.com");
        when(userRepository.findByEmailAddress("test@example.com")).thenReturn(Optional.of(testUser));
        when(otpService.generatePasswordResetCode("user-1", "test@example.com", null)).thenReturn("reset-session");

        assertEquals("reset-session", authService.requestPasswordReset("test@example.com"));
    }

    @Test
    void resetPassword_weakPassword_isRefusedBeforeCheckingTheCode() {
        doThrow(new PasswordWeakException("Password must be at least 8 characters")).when(passwordValidator).validate("short");
        assertThrows(PasswordWeakException.class, () -> authService.resetPassword("reset-session", "123456", "short"));
        verify(otpService, never()).validatePasswordResetCode(any(), any());
    }

    @Test
    void resetPassword_success_unlocks_verifies_signsOutEverywhere_andNotifies() {
        testUser.setAccountLocked(true);
        testUser.setFailedLoginAttempts(5);
        when(otpService.validatePasswordResetCode("reset-session", "123456")).thenReturn("user-1");
        when(userRepository.findById("user-1")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.encode("NewStrong#2026")).thenReturn("new-hash");

        authService.resetPassword("reset-session", "123456", "NewStrong#2026");

        assertEquals("new-hash", testUser.getPasswordHash());
        assertFalse(testUser.getAccountLocked());
        assertEquals(0, testUser.getFailedLoginAttempts());
        assertTrue(testUser.getEmailVerified());
        verify(refreshTokenService).revokeAllUserTokens("user-1");
        verify(emailService).sendPasswordChangedNotice("test@example.com", null);
    }

    // ── Change password (users and admins) ────────────────────────

    @Test
    void changePassword_worksForAdmins() {
        tn.enicarthage.backend.entity.Admin admin = tn.enicarthage.backend.entity.Admin.builder()
                .adminId("admin-1").adminEmail("admin@test.com").adminName("Admin").passwordHash("admin-hash").build();
        when(userRepository.findById("admin-1")).thenReturn(Optional.empty());
        when(adminRepository.findById("admin-1")).thenReturn(Optional.of(admin));
        when(passwordEncoder.matches("Old#Admin2026", "admin-hash")).thenReturn(true);
        when(passwordEncoder.matches("New#Admin2026", "admin-hash")).thenReturn(false);
        when(passwordEncoder.encode("New#Admin2026")).thenReturn("new-admin-hash");

        assertTrue(authService.changePassword("admin-1", "Old#Admin2026", "New#Admin2026"));

        assertEquals("new-admin-hash", admin.getPasswordHash());
        verify(refreshTokenService).revokeAllUserTokens("admin-1");
        verify(emailService).sendPasswordChangedNotice("admin@test.com", "Admin");
    }

    @Test
    void changePassword_wrongCurrentPassword_isAClear400_notALogout() {
        when(userRepository.findById("user-1")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("nope", "hashed-password")).thenReturn(false);
        assertThrows(WrongCurrentPasswordException.class, () -> authService.changePassword("user-1", "nope", "New#Pass2026"));
        verify(userRepository, never()).save(any());
    }

    @Test
    void changePassword_sameAsCurrent_isRefused() {
        when(userRepository.findById("user-1")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("Same#Pass2026", "hashed-password")).thenReturn(true);
        assertThrows(PasswordWeakException.class, () -> authService.changePassword("user-1", "Same#Pass2026", "Same#Pass2026"));
    }
}

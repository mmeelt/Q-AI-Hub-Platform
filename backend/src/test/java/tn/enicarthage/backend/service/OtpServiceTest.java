package tn.enicarthage.backend.service;

import tn.enicarthage.backend.entity.OtpToken;
import tn.enicarthage.backend.entity.User;
import tn.enicarthage.backend.exception.*;
import tn.enicarthage.backend.repository.OtpTokenRepository;
import tn.enicarthage.backend.repository.UserRepository;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Date;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OtpServiceTest {

    @Mock
    private OtpTokenRepository otpTokenRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private EmailService emailService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private OtpService otpService;

    private User testUser;
    private OtpToken testToken;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(otpService, "otpExpiryMinutes", 5);
        ReflectionTestUtils.setField(otpService, "otpMaxAttempts", 3);

        testUser = User.builder()
                .userId("user-1")
                .emailAddress("test@example.com")
                .fullName("Test User")
                .build();

        testToken = OtpToken.builder()
                .otpSessionId("session-123")
                .userId("user-1")
                .otpCode("encoded-482913")
                .expiryTime(new Date(System.currentTimeMillis() + 10000))
                .isUsed(false)
                .attempts(0)
                .createdAt(new Date())
                .build();
    }

    @Test
    void generateAndSendOtp_success() {
        when(passwordEncoder.encode(any(CharSequence.class))).thenReturn("encoded-random");
        String sessionId = otpService.generateAndSendOtp("user-1", "test@example.com", "Test User");

        assertNotNull(sessionId);
        verify(otpTokenRepository).deleteByUserId("user-1");
        
        ArgumentCaptor<OtpToken> captor = ArgumentCaptor.forClass(OtpToken.class);
        verify(otpTokenRepository).save(captor.capture());
        assertEquals("user-1", captor.getValue().getUserId());
        assertEquals("encoded-random", captor.getValue().getOtpCode());
        assertFalse(captor.getValue().getIsUsed());
        
        // The code is sent synchronously so a delivery failure fails the login
        verify(emailService).sendOtpCodeNow(eq("test@example.com"), eq("Test User"), anyString(), anyInt());
    }

    @Test
    void validateOtp_success() {
        when(otpTokenRepository.findByOtpSessionId("session-123")).thenReturn(Optional.of(testToken));
        when(passwordEncoder.matches("482913", "encoded-482913")).thenReturn(true);

        String userId = otpService.validateOtp("session-123", "482913");

        assertEquals("user-1", userId);
        assertTrue(testToken.getIsUsed());
        verify(otpTokenRepository, times(2)).save(testToken);
    }

    @Test
    void validateOtp_alreadyUsed() {
        testToken.setIsUsed(true);
        when(otpTokenRepository.findByOtpSessionId("session-123")).thenReturn(Optional.of(testToken));

        assertThrows(OtpAlreadyUsedException.class, () -> otpService.validateOtp("session-123", "482913"));
    }

    @Test
    void validateOtp_expired() {
        testToken.setExpiryTime(new Date(System.currentTimeMillis() - 10000)); // past
        when(otpTokenRepository.findByOtpSessionId("session-123")).thenReturn(Optional.of(testToken));

        assertThrows(OtpExpiredException.class, () -> otpService.validateOtp("session-123", "482913"));
        // kept so the user can still resend from this session
        verify(otpTokenRepository, never()).delete(any(OtpToken.class));
    }

    @Test
    void validateOtp_incorrectCode() {
        when(otpTokenRepository.findByOtpSessionId("session-123")).thenReturn(Optional.of(testToken));
        when(passwordEncoder.matches("000000", "encoded-482913")).thenReturn(false);

        OtpInvalidException ex = assertThrows(OtpInvalidException.class, 
                () -> otpService.validateOtp("session-123", "000000"));
        
        assertEquals(1, testToken.getAttempts());
        assertEquals(2, ex.getAttemptsRemaining());
        verify(otpTokenRepository).save(testToken);
    }

    @Test
    void validateOtp_maxAttemptsExceeded() {
        testToken.setAttempts(3);
        when(otpTokenRepository.findByOtpSessionId("session-123")).thenReturn(Optional.of(testToken));

        assertThrows(OtpMaxAttemptsException.class, () -> otpService.validateOtp("session-123", "000000"));
        verify(otpTokenRepository, never()).delete(any(OtpToken.class));
        verify(passwordEncoder, never()).matches(any(), any());
    }

    @Test
    void validateOtp_thirdWrongCodeLocksTheSession() {
        testToken.setAttempts(2);
        when(otpTokenRepository.findByOtpSessionId("session-123")).thenReturn(Optional.of(testToken));
        when(passwordEncoder.matches("000000", "encoded-482913")).thenReturn(false);

        OtpInvalidException ex = assertThrows(OtpInvalidException.class,
                () -> otpService.validateOtp("session-123", "000000"));
        assertEquals(0, ex.getAttemptsRemaining());
        // even the right code is now refused until a new one is sent
        assertThrows(OtpMaxAttemptsException.class, () -> otpService.validateOtp("session-123", "482913"));
    }

    // ── Resend ────────────────────────────────────────────────────

    @Test
    void resendOtp_worksAfterTheCodeExpired() {
        testToken.setExpiryTime(new Date(System.currentTimeMillis() - 10000));
        when(otpTokenRepository.findByOtpSessionId("session-123")).thenReturn(Optional.of(testToken));
        when(userRepository.findById("user-1")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.encode(any(CharSequence.class))).thenReturn("encoded-new");

        String newSession = otpService.resendOtp("session-123");

        assertNotNull(newSession);
        assertNotEquals("session-123", newSession);
        verify(emailService).sendOtpCodeNow(eq("test@example.com"), eq("Test User"), anyString(), anyInt());
    }

    @Test
    void resendOtp_keepsThePasswordResetPurpose() {
        testToken.setPurpose(OtpToken.PASSWORD_RESET);
        when(otpTokenRepository.findByOtpSessionId("session-123")).thenReturn(Optional.of(testToken));
        when(userRepository.findById("user-1")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.encode(any(CharSequence.class))).thenReturn("encoded-new");

        otpService.resendOtp("session-123");

        verify(emailService).sendPasswordResetCodeNow(eq("test@example.com"), eq("Test User"), anyString(), anyInt());
        verify(emailService, never()).sendOtpCodeNow(any(), any(), any(), anyInt());
    }

    @Test
    void resendOtp_refusedOnceTheCodeWasUsed() {
        testToken.setIsUsed(true);
        when(otpTokenRepository.findByOtpSessionId("session-123")).thenReturn(Optional.of(testToken));

        assertThrows(OtpNotFoundException.class, () -> otpService.resendOtp("session-123"));
        verifyNoInteractions(emailService);
    }

    // ── Login codes and reset codes never mix ─────────────────────

    @Test
    void resetCode_cannotBeUsedToLogIn() {
        testToken.setPurpose(OtpToken.PASSWORD_RESET);
        when(otpTokenRepository.findByOtpSessionId("session-123")).thenReturn(Optional.of(testToken));
        assertThrows(OtpNotFoundException.class, () -> otpService.validateOtp("session-123", "482913"));
        verify(passwordEncoder, never()).matches(any(), any());
    }

    @Test
    void loginCode_cannotBeUsedToResetThePassword() {
        testToken.setPurpose(null); // older codes = login codes
        when(otpTokenRepository.findByOtpSessionId("session-123")).thenReturn(Optional.of(testToken));
        assertThrows(OtpNotFoundException.class, () -> otpService.validatePasswordResetCode("session-123", "482913"));
    }

    @Test
    void resetCode_isAcceptedForAReset() {
        testToken.setPurpose(OtpToken.PASSWORD_RESET);
        when(otpTokenRepository.findByOtpSessionId("session-123")).thenReturn(Optional.of(testToken));
        when(passwordEncoder.matches("482913", "encoded-482913")).thenReturn(true);
        assertEquals("user-1", otpService.validatePasswordResetCode("session-123", "482913"));
        assertTrue(testToken.getIsUsed());
    }

    @Test
    void passwordResetCode_isEmailedWithTheResetTemplate() {
        when(passwordEncoder.encode(any(CharSequence.class))).thenReturn("encoded");
        otpService.generatePasswordResetCode("user-1", "test@example.com", "Test User");
        verify(emailService).sendPasswordResetCodeNow(eq("test@example.com"), eq("Test User"), anyString(), anyInt());
        verify(emailService, never()).sendOtpCodeNow(any(), any(), any(), anyInt());
    }
}

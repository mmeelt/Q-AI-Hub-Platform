package tn.enicarthage.backend.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import tn.enicarthage.backend.dto.*;
import tn.enicarthage.backend.exception.InvalidCredentialsException;
import tn.enicarthage.backend.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Locale;

@Tag(name = "Authentication", description = "Sign-up, two-step login (password + emailed code), session refresh, password reset")
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final tn.enicarthage.backend.security.AuthCookies authCookies;

    @PostMapping("/register")
    public ResponseEntity<LoginPendingResponse> register(@Valid @RequestBody RegisterRequest dto) {
        return ResponseEntity.ok(authService.register(dto));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest dto) {
        LoginPendingResponse result = authService.login(dto);
        if (result.getSession() == null) {
            return ResponseEntity.ok(result); // a code was emailed
        }
        // No code needed (email already verified and "Require email verification" is off)
        AuthResponse auth = result.getSession();
        String[] cookies = authCookies.session(auth.getAccessToken(), auth.getRefreshToken(),
                Boolean.TRUE.equals(dto.getRememberMe()));
        java.util.Map<String, Object> body = new java.util.LinkedHashMap<>();
        body.put("requiresOtp", false);
        body.put("userId", auth.getUserId());
        body.put("email", auth.getEmail());
        body.put("role", auth.getRole());
        body.put("fullName", auth.getFullName());
        return ResponseEntity.ok()
                .header(tn.enicarthage.backend.security.AuthCookies.SET_COOKIE, cookies)
                .body(body);
    }

    @PostMapping("/resend-otp")
    public ResponseEntity<LoginPendingResponse> resendOtp(@Valid @RequestBody ResendOtpRequest dto) {
        String newSessionId = authService.resendOtp(dto.getOtpSessionId());
        return ResponseEntity.ok(LoginPendingResponse.builder()
                .requiresOtp(true)
                .otpSessionId(newSessionId)
                .message("OTP resent")
                .expiresIn(300)
                .build());
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<AuthResponse> verifyOtp(@Valid @RequestBody VerifyOtpRequest dto) {
        return withSessionCookies(authService.verifyOtpAndLogin(dto), Boolean.TRUE.equals(dto.getRememberMe()));
    }

    // The refresh token comes from its HttpOnly cookie (or the body, for API clients)
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(
            @RequestBody(required = false) RefreshTokenRequest dto,
            jakarta.servlet.http.HttpServletRequest request) {
        String refreshToken = dto != null && dto.getRefreshToken() != null && !dto.getRefreshToken().isBlank()
                ? dto.getRefreshToken()
                : tn.enicarthage.backend.security.AuthCookies.read(request, tn.enicarthage.backend.security.AuthCookies.REFRESH);
        if (refreshToken == null) {
            throw new InvalidCredentialsException("No refresh token");
        }
        return withSessionCookies(authService.refreshAccessToken(refreshToken),
                tn.enicarthage.backend.security.AuthCookies.remembered(request));
    }

    // Always succeeds and clears the session cookies; revokes whatever tokens were presented
    @PostMapping("/logout")
    public ResponseEntity<Boolean> logout(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody(required = false) RefreshTokenRequest body,
            jakarta.servlet.http.HttpServletRequest request) {
        String accessToken = authHeader != null && !authHeader.isBlank()
                ? parseBearerAccessToken(authHeader)
                : tn.enicarthage.backend.security.AuthCookies.read(request, tn.enicarthage.backend.security.AuthCookies.ACCESS);
        String refreshToken = body != null && body.getRefreshToken() != null && !body.getRefreshToken().isBlank()
                ? body.getRefreshToken()
                : tn.enicarthage.backend.security.AuthCookies.read(request, tn.enicarthage.backend.security.AuthCookies.REFRESH);
        try {
            authService.logout(accessToken, refreshToken);
        } catch (RuntimeException ignored) {
            // expired/unknown tokens: nothing left to revoke
        }
        return ResponseEntity.ok()
                .header(tn.enicarthage.backend.security.AuthCookies.SET_COOKIE, authCookies.clearAll())
                .body(true);
    }

    /** Puts the tokens in HttpOnly cookies and removes them from the JSON body. */
    private ResponseEntity<AuthResponse> withSessionCookies(AuthResponse auth, boolean persistent) {
        String[] cookies = authCookies.session(auth.getAccessToken(), auth.getRefreshToken(), persistent);
        auth.setAccessToken(null);
        auth.setRefreshToken(null);
        return ResponseEntity.ok()
                .header(tn.enicarthage.backend.security.AuthCookies.SET_COOKIE, cookies)
                .body(auth);
    }

    private static String parseBearerAccessToken(String authHeader) {
        if (authHeader == null || authHeader.isBlank()) {
            throw new InvalidCredentialsException("Missing Authorization header");
        }
        String trimmed = authHeader.trim();
        String lower = trimmed.toLowerCase(Locale.ROOT);
        if (!lower.startsWith("bearer")) {
            throw new InvalidCredentialsException("Authorization header must be a Bearer token");
        }
        int i = "bearer".length();
        while (i < trimmed.length() && Character.isWhitespace(trimmed.charAt(i))) {
            i++;
        }
        String token = trimmed.substring(i).trim();
        if (token.isEmpty()) {
            throw new InvalidCredentialsException("Bearer token is empty");
        }
        return token;
    }

    // ── Forgot password ───────────────────────────────────────────

    record ForgotPasswordRequest(@jakarta.validation.constraints.NotBlank String email) {}

    record ResetPasswordRequest(@jakarta.validation.constraints.NotBlank String resetSessionId,
                                @jakarta.validation.constraints.NotBlank String code,
                                @jakarta.validation.constraints.NotBlank String newPassword) {}

    // POST /api/auth/forgot-password — same answer whether or not the email has an account
    @PostMapping("/forgot-password")
    public ResponseEntity<java.util.Map<String, Object>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest dto) {
        String sessionId = authService.requestPasswordReset(dto.email());
        return ResponseEntity.ok(java.util.Map.of(
                "resetSessionId", sessionId,
                "message", "If an account exists for this email, a reset code has been sent.",
                "expiresIn", 300));
    }

    // POST /api/auth/reset-password
    @PostMapping("/reset-password")
    public ResponseEntity<java.util.Map<String, String>> resetPassword(@Valid @RequestBody ResetPasswordRequest dto) {
        authService.resetPassword(dto.resetSessionId(), dto.code(), dto.newPassword());
        return ResponseEntity.ok(java.util.Map.of("message", "Your password has been changed. You can now log in."));
    }

    @PutMapping("/change-password")
    public ResponseEntity<Boolean> changePassword(@Valid @RequestBody ChangePasswordRequest dto,
            jakarta.servlet.http.HttpServletRequest request) {
        String accountId = SecurityContextHolder.getContext().getAuthentication().getName();
        authService.changePassword(accountId, dto.getOldPassword(), dto.getNewPassword());
        // Other devices are signed out; this one gets a fresh session so the user stays logged in here
        AuthResponse fresh = authService.issueSession(accountId);
        boolean remembered = tn.enicarthage.backend.security.AuthCookies.remembered(request);
        return ResponseEntity.ok().headers(withSessionCookies(fresh, remembered).getHeaders()).body(true);
    }
}

package tn.enicarthage.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import tn.enicarthage.backend.dto.*;
import tn.enicarthage.backend.exception.EmailAlreadyExistsException;
import tn.enicarthage.backend.exception.PasswordWeakException;
import tn.enicarthage.backend.security.AuthCookies;
import tn.enicarthage.backend.service.AuthService;
import tn.enicarthage.backend.exception.GlobalExceptionHandler;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import java.util.Collections;

import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.hamcrest.Matchers.allOf;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasItems;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class AuthControllerTest {

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final AuthService authService = mock(AuthService.class);
    private final AuthCookies authCookies = new AuthCookies();
    private final AuthController controller = new AuthController(authService, authCookies);

    @BeforeEach
    void setup() {
        SecurityContextHolder.clearContext();
        objectMapper.findAndRegisterModules();
        ReflectionTestUtils.setField(authCookies, "secure", true);
        ReflectionTestUtils.setField(authCookies, "accessTtlMs", 3_600_000L);
        ReflectionTestUtils.setField(authCookies, "refreshTtlMs", 604_800_000L);
        this.mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setMessageConverters(new MappingJackson2HttpMessageConverter(objectMapper))
                .build();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private static AuthResponse authResponse() {
        return new AuthResponse("access.jwt", "refresh-1", 3600L, "user-1", "test@example.com", "USER", "Test User");
    }

    @Test
    void register_requiresOtp() throws Exception {
        when(authService.register(any(RegisterRequest.class))).thenReturn(LoginPendingResponse.builder()
                .requiresOtp(true).otpSessionId("otp-session-1").message("Account created").expiresIn(300).build());

        RegisterRequest dto = new RegisterRequest();
        dto.setEmail("test@example.com");
        dto.setPassword("Aa1!aaaa");
        dto.setFullName("Test User");
        dto.setUniversityName("Test University");
        dto.setStudentId("stu-1");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.requiresOtp").value(true))
                .andExpect(jsonPath("$.otpSessionId").value("otp-session-1"));
    }

    @Test
    void login_returnsLoginPendingResponse() throws Exception {
        LoginPendingResponse pending = LoginPendingResponse.builder()
                .requiresOtp(true)
                .otpSessionId("otp-session-1")
                .message("OTP sent to your email")
                .expiresIn(300)
                .build();

        when(authService.login(any(LoginRequest.class))).thenReturn(pending);

        LoginRequest dto = new LoginRequest();
        dto.setEmail("test@example.com");
        dto.setPassword("Aa1!aaaa");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.requiresOtp").value(true))
                .andExpect(jsonPath("$.otpSessionId").value("otp-session-1"))
                .andExpect(jsonPath("$.expiresIn").value(300));
    }

    @Test
    void verifyOtp_setsHttpOnlyCookies_andKeepsTokensOutOfTheBody() throws Exception {
        when(authService.verifyOtpAndLogin(any(VerifyOtpRequest.class))).thenReturn(authResponse());

        mockMvc.perform(post("/api/auth/verify-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"otpSessionId\":\"otp-session-1\",\"otpCode\":\"123456\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").doesNotExist())
                .andExpect(jsonPath("$.refreshToken").doesNotExist())
                .andExpect(jsonPath("$.email").value("test@example.com"))
                .andExpect(jsonPath("$.role").value("USER"))
                .andExpect(header().stringValues("Set-Cookie", hasItems(
                        allOf(org.hamcrest.Matchers.startsWith("qa_access=access.jwt"), containsString("HttpOnly"),
                                containsString("SameSite=Strict"), containsString("Secure"), containsString("Path=/api")),
                        allOf(org.hamcrest.Matchers.startsWith("qa_refresh=refresh-1"), containsString("HttpOnly"),
                                containsString("Path=/api/auth")))));
    }

    @Test
    void refresh_readsTheRefreshCookie() throws Exception {
        when(authService.refreshAccessToken("refresh-1")).thenReturn(authResponse());

        mockMvc.perform(post("/api/auth/refresh").cookie(new Cookie(AuthCookies.REFRESH, "refresh-1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").doesNotExist())
                .andExpect(header().stringValues("Set-Cookie", hasItem(org.hamcrest.Matchers.startsWith("qa_access=access.jwt"))));
    }

    @Test
    void refresh_withoutToken_returns401() throws Exception {
        mockMvc.perform(post("/api/auth/refresh"))
                .andExpect(status().isUnauthorized());
        verify(authService, never()).refreshAccessToken(anyString());
    }

    @Test
    void logout_withCookies_revokesTokens_andClearsCookies() throws Exception {
        mockMvc.perform(post("/api/auth/logout")
                        .cookie(new Cookie(AuthCookies.ACCESS, "access.jwt"), new Cookie(AuthCookies.REFRESH, "refresh-1")))
                .andExpect(status().isOk())
                .andExpect(content().string("true"))
                .andExpect(header().stringValues("Set-Cookie", hasItems(
                        allOf(org.hamcrest.Matchers.startsWith("qa_access=;"), containsString("Max-Age=0")),
                        allOf(org.hamcrest.Matchers.startsWith("qa_refresh=;"), containsString("Max-Age=0")))));
        verify(authService).logout("access.jwt", "refresh-1");
    }

    @Test
    void logout_withBearerHeaderAndBody_callsService() throws Exception {
        RefreshTokenRequest body = new RefreshTokenRequest();
        body.setRefreshToken("refresh-1");

        mockMvc.perform(post("/api/auth/logout")
                        .header("Authorization", "bearer access.jwt")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk());
        verify(authService).logout("access.jwt", "refresh-1");
    }

    @Test
    void logout_withoutAnyToken_stillSucceeds() throws Exception {
        mockMvc.perform(post("/api/auth/logout"))
                .andExpect(status().isOk())
                .andExpect(content().string("true"));
    }

    @Test
    void changePassword_usesSecurityContextName() throws Exception {
        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken("user-1", null, Collections.emptyList());
        SecurityContextHolder.getContext().setAuthentication(authentication);

        when(authService.changePassword(eq("user-1"), eq("old-password"), eq("new-password"))).thenReturn(true);
        when(authService.issueSession("user-1")).thenReturn(authResponse());

        ChangePasswordRequest dto = new ChangePasswordRequest();
        dto.setOldPassword("old-password");
        dto.setNewPassword("new-password");

        mockMvc.perform(put("/api/auth/change-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(content().string("true"))
                // other devices are signed out; this one keeps a fresh session
                .andExpect(header().stringValues("Set-Cookie", hasItem(org.hamcrest.Matchers.startsWith("qa_access=access.jwt"))));
    }

    @Test
    void register_exceptionEmailAlreadyExists_returns409() throws Exception {
        when(authService.register(any(RegisterRequest.class)))
                .thenThrow(new EmailAlreadyExistsException("Email already exists"));

        RegisterRequest dto = new RegisterRequest();
        dto.setEmail("test@example.com");
        dto.setPassword("Aa1!aaaa");
        dto.setFullName("Test User");
        dto.setUniversityName("Test University");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("Email already exists"))
                .andExpect(jsonPath("$.status").value(409));
    }

    @Test
    void changePassword_exceptionPasswordWeak_returns400() throws Exception {
        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken("user-1", null, Collections.emptyList());
        SecurityContextHolder.getContext().setAuthentication(authentication);

        when(authService.changePassword(eq("user-1"), anyString(), anyString()))
                .thenThrow(new PasswordWeakException("Password must contain at least 1 special character"));

        ChangePasswordRequest dto = new ChangePasswordRequest();
        dto.setOldPassword("old-password");
        dto.setNewPassword("new-password");

        mockMvc.perform(put("/api/auth/change-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Password must contain at least 1 special character"))
                .andExpect(jsonPath("$.status").value(400));
    }

    // ── Remember me ───────────────────────────────────────────────

    @Test
    void verifyOtp_withoutRememberMe_setsSessionCookies_thatDieWithTheBrowser() throws Exception {
        when(authService.verifyOtpAndLogin(any(VerifyOtpRequest.class))).thenReturn(authResponse());

        mockMvc.perform(post("/api/auth/verify-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"otpSessionId\":\"s\",\"otpCode\":\"123456\"}"))
                .andExpect(status().isOk())
                .andExpect(header().stringValues("Set-Cookie", hasItem(allOf(
                        org.hamcrest.Matchers.startsWith("qa_access=access.jwt"),
                        org.hamcrest.Matchers.not(containsString("Max-Age"))))));
    }

    @Test
    void verifyOtp_withRememberMe_setsPersistentCookies_andTheMarker() throws Exception {
        when(authService.verifyOtpAndLogin(any(VerifyOtpRequest.class))).thenReturn(authResponse());

        mockMvc.perform(post("/api/auth/verify-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"otpSessionId\":\"s\",\"otpCode\":\"123456\",\"rememberMe\":true}"))
                .andExpect(status().isOk())
                .andExpect(header().stringValues("Set-Cookie", hasItems(
                        allOf(org.hamcrest.Matchers.startsWith("qa_access=access.jwt"), containsString("Max-Age=3600")),
                        allOf(org.hamcrest.Matchers.startsWith("qa_refresh=refresh-1"), containsString("Max-Age=604800")),
                        org.hamcrest.Matchers.startsWith("qa_remember=1"))));
    }

    @Test
    void refresh_keepsTheRememberMeChoice() throws Exception {
        when(authService.refreshAccessToken("refresh-1")).thenReturn(authResponse());

        mockMvc.perform(post("/api/auth/refresh")
                        .cookie(new Cookie(AuthCookies.REFRESH, "refresh-1"), new Cookie(AuthCookies.REMEMBER, "1")))
                .andExpect(status().isOk())
                .andExpect(header().stringValues("Set-Cookie", hasItem(
                        allOf(org.hamcrest.Matchers.startsWith("qa_access=access.jwt"), containsString("Max-Age=3600")))));
    }
}

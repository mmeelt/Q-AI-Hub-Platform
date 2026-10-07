package tn.enicarthage.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import tn.enicarthage.backend.dto.AdminLoginRequest;
import tn.enicarthage.backend.dto.InviteExpertRequest;
import tn.enicarthage.backend.service.AdminService;
import tn.enicarthage.backend.service.StartupService;
import tn.enicarthage.backend.exception.GlobalExceptionHandler;
import tn.enicarthage.backend.exception.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Map;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class AdminControllerTest {

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final AdminService adminService = mock(AdminService.class);
    private final StartupService startupService = mock(StartupService.class);
    private final tn.enicarthage.backend.repository.UserRepository userRepository = mock(tn.enicarthage.backend.repository.UserRepository.class);
    private final tn.enicarthage.backend.repository.StartupRepository startupRepository = mock(tn.enicarthage.backend.repository.StartupRepository.class);
    private final tn.enicarthage.backend.repository.EventRepository eventRepository = mock(tn.enicarthage.backend.repository.EventRepository.class);
    private final tn.enicarthage.backend.repository.ApplicationRepository applicationRepository = mock(tn.enicarthage.backend.repository.ApplicationRepository.class);
    private final AdminController controller = new AdminController(adminService, startupService, userRepository,
            startupRepository, eventRepository, applicationRepository);


    @BeforeEach
    void setup() {
        objectMapper.findAndRegisterModules();
        this.mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setMessageConverters(new MappingJackson2HttpMessageConverter(objectMapper))
                .build();
    }

    @Test
    void login_requiresOtp() throws Exception {
        // Admin login is two-step: credentials first, then the OTP sent by email
        when(adminService.login(any(AdminLoginRequest.class))).thenReturn(
                tn.enicarthage.backend.dto.LoginPendingResponse.builder()
                        .requiresOtp(true).otpSessionId("otp-session").message("OTP sent").expiresIn(300).build());

        AdminLoginRequest dto = new AdminLoginRequest();
        dto.setEmail("admin@test.com");
        dto.setPassword("Aa1!aaaa");

        mockMvc.perform(post("/api/admin/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.requiresOtp").value(true))
                .andExpect(jsonPath("$.otpSessionId").value("otp-session"));
    }

    @Test
    void inviteExpert_returnsOk() throws Exception {
        InviteExpertRequest dto = new InviteExpertRequest();
        dto.setEmail("expert@test.com");
        dto.setExpertRole("MENTOR");
        dto.setEventId("event-1");

        mockMvc.perform(post("/api/admin/invite-expert")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());

        verify(adminService).inviteExpert("expert@test.com", "MENTOR", "event-1");
    }

    @Test
    void inviteExpert_invalidEmail_returns400() throws Exception {
        InviteExpertRequest dto = new InviteExpertRequest();
        dto.setEmail("not-an-email");
        dto.setExpertRole("MENTOR");

        mockMvc.perform(post("/api/admin/invite-expert")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isBadRequest());

        verify(adminService, never()).inviteExpert(anyString(), anyString(), any());
    }

    @Test
    void manageUsers_returnsOk() throws Exception {
        mockMvc.perform(post("/api/admin/users/user-1/manage")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("action", "suspend"))))
                .andExpect(status().isOk());
    }

    @Test
    void manageUsers_whenNotFound_returns404() throws Exception {
        doThrow(new ResourceNotFoundException("User not found"))
                .when(adminService)
                .manageUsers(eq("suspend"), eq("user-1"));

        mockMvc.perform(post("/api/admin/users/user-1/manage")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("action", "suspend"))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("User not found"))
                .andExpect(jsonPath("$.status").value(404));
    }
}


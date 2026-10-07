package tn.enicarthage.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import tn.enicarthage.backend.dto.CreateStartupRequest;
import tn.enicarthage.backend.entity.Startup;
import tn.enicarthage.backend.exception.GlobalExceptionHandler;
import tn.enicarthage.backend.exception.ResourceNotFoundException;
import tn.enicarthage.backend.service.StartupService;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class StartupControllerTest {

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final StartupService startupService = mock(StartupService.class);
    private final tn.enicarthage.backend.service.GeminiService geminiService = mock(tn.enicarthage.backend.service.GeminiService.class);
    private final tn.enicarthage.backend.service.TeammateInvitationService teammateInvitationService =
            mock(tn.enicarthage.backend.service.TeammateInvitationService.class);
    private final tn.enicarthage.backend.service.JudgeAccessService judgeAccess =
            mock(tn.enicarthage.backend.service.JudgeAccessService.class);
    private final StartupController controller = new StartupController(startupService, geminiService,
            teammateInvitationService, judgeAccess);


    @org.junit.jupiter.api.BeforeEach
    void setup() {
        objectMapper.findAndRegisterModules();
        this.mockMvc = org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setMessageConverters(new org.springframework.http.converter.json.MappingJackson2HttpMessageConverter(objectMapper))
                .build();
                
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken("user-1", "password")
        );
    }

    @Test
    void createStartup_returnsStartup() throws Exception {
        Startup startup = Startup.builder()
                .startupId("startup-1")
                .founderUserId("user-1")
                .projectName("Test Project")
                .startupStatus(Startup.StartupStatus.DRAFT)
                .build();

        when(startupService.createStartup(any(CreateStartupRequest.class), anyString())).thenReturn(startup);


        CreateStartupRequest dto = new CreateStartupRequest();
        dto.setProjectName("Test Project");

        mockMvc.perform(post("/api/startups")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.startupId").value("startup-1"))
                .andExpect(jsonPath("$.projectName").value("Test Project"))
                .andExpect(jsonPath("$.startupStatus").value("DRAFT"));
    }

    @Test
    void updateStatus_returnsOk() throws Exception {
        mockMvc.perform(put("/api/startups/startup-1/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("status", "ACTIVE"))))
                .andExpect(status().isOk());
    }

    @Test
    void getStartup_whenNotAllowed_returns403() throws Exception {
        // Only the founder, teammates, admins or judges of the startup's events may read it
        doThrow(new org.springframework.security.access.AccessDeniedException("nope"))
                .when(judgeAccess).assertCanViewStartup("startup-1");

        mockMvc.perform(get("/api/startups/startup-1"))
                .andExpect(status().isForbidden());
        verify(startupService, never()).getStartupById(anyString());
    }

    @Test
    void getActiveDescription_whenNotFound_returns404() throws Exception {
        when(startupService.getActiveDescription("startup-1"))
                .thenThrow(new ResourceNotFoundException("Startup not found"));

        mockMvc.perform(get("/api/startups/startup-1/description"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Startup not found"))
                .andExpect(jsonPath("$.status").value(404));
    }
}


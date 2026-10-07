package tn.enicarthage.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import tn.enicarthage.backend.exception.GlobalExceptionHandler;
import tn.enicarthage.backend.exception.ResourceNotFoundException;
import tn.enicarthage.backend.service.PlatformSettingService;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class PlatformSettingControllerTest {

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final PlatformSettingService platformSettingService = mock(PlatformSettingService.class);
    private final PlatformSettingController controller = new PlatformSettingController(platformSettingService);

    @Test
    void toggleFeature_returnsOk() throws Exception {
        objectMapper.findAndRegisterModules();
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setMessageConverters(new MappingJackson2HttpMessageConverter(objectMapper))
                .build();

        Map<String, Object> payload = Map.of("key", "allowPublicRegistrations", "value", true);

        mockMvc.perform(put("/api/settings/feature")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk());

        verify(platformSettingService).toggleFeature(eq("allowPublicRegistrations"), eq(true));
    }

    @Test
    void getGlobalSettings_whenNotFound_returns404() throws Exception {
        objectMapper.findAndRegisterModules();
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setMessageConverters(new MappingJackson2HttpMessageConverter(objectMapper))
                .build();

        when(platformSettingService.getGlobalSettings())
                .thenThrow(new ResourceNotFoundException("Global settings not found"));

        mockMvc.perform(get("/api/settings"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Global settings not found"))
                .andExpect(jsonPath("$.status").value(404));
    }
}


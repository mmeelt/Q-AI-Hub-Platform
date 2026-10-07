package tn.enicarthage.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import tn.enicarthage.backend.dto.*;
import tn.enicarthage.backend.exception.GlobalExceptionHandler;
import tn.enicarthage.backend.exception.ResourceNotFoundException;
import tn.enicarthage.backend.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;

import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class UserControllerTest {

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final UserService userService = mock(UserService.class);
    private final tn.enicarthage.backend.service.AccountDeletionService accountDeletionService =
            mock(tn.enicarthage.backend.service.AccountDeletionService.class);
    private final UserController controller = new UserController(userService, accountDeletionService);

    @BeforeEach
    void setup() {
        SecurityContextHolder.clearContext();
        objectMapper.findAndRegisterModules();
        this.mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setMessageConverters(new MappingJackson2HttpMessageConverter(objectMapper))
                .build();
    }

    @Test
    void updateProfile_returnsOk() throws Exception {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("user-1", null, Collections.emptyList())
        );

        mockMvc.perform(put("/api/users/profile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UpdateProfileRequest())))
                .andExpect(status().isOk());
    }

    @Test
    void getProfile_returnsUserProfileResponse() throws Exception {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("user-1", null, Collections.emptyList())
        );

        UserProfileResponse response = new UserProfileResponse();
        response.setUserId("user-1");
        response.setEmailAddress("test@example.com");
        response.setFullName("Test User");

        when(userService.getUserProfile("user-1")).thenReturn(response);

        mockMvc.perform(get("/api/users/profile"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value("user-1"))
                .andExpect(jsonPath("$.emailAddress").value("test@example.com"));
    }

    @Test
    void getProfile_whenUserNotFound_returns404() throws Exception {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("user-1", null, Collections.emptyList())
        );

        when(userService.getUserProfile("user-1")).thenThrow(new ResourceNotFoundException("User not found"));

        mockMvc.perform(get("/api/users/profile"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("User not found"))
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void deleteAccount_removesEverythingOfTheCurrentUser() throws Exception {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("u1", null, Collections.emptyList()));
        mockMvc.perform(delete("/api/users/me")).andExpect(status().isNoContent());
        verify(accountDeletionService).deleteAccount("u1");
        verify(userService, never()).deleteUser(any());
    }
}

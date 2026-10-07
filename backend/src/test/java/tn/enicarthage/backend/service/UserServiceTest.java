package tn.enicarthage.backend.service;

import tn.enicarthage.backend.dto.UpdateProfileRequest;
import tn.enicarthage.backend.entity.User;
import tn.enicarthage.backend.exception.ResourceNotFoundException;
import tn.enicarthage.backend.repository.StartupRepository;
import tn.enicarthage.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class UserServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private StartupRepository startupRepository;

    @InjectMocks
    private UserService userService;

    private User user;

    @BeforeEach
    void setUp() {
        user = User.builder()
                .userId("user-1")
                .fullName("Old Name")
                .build();
    }

    @Test
    void updateNotifPrefs_shouldUpdate() {
        when(userRepository.findById("user-1")).thenReturn(Optional.of(user));
        userService.updateNotifPrefs("user-1", "NEW_PREFS");
        assertEquals("NEW_PREFS", user.getNotificationPrefs());
    }

    @Test
    void getUserProfile_returnsUser() {
        when(userRepository.findById("user-1")).thenReturn(Optional.of(user));
        tn.enicarthage.backend.dto.UserProfileResponse result = userService.getUserProfile("user-1");
        assertEquals("Old Name", result.getFullName());
    }

    @Test
    void updateProfile_ignoresNulls() {
        when(userRepository.findById("user-1")).thenReturn(Optional.of(user));
        
        UpdateProfileRequest dto = new UpdateProfileRequest();
        dto.setFullName("New Name");
        // Leave bio and location null
        
        userService.updateProfile("user-1", dto);
        
        assertEquals("New Name", user.getFullName());
        verify(userRepository).save(user);
    }

    @Test
    void manageMyStartup_withoutStartup_returnsEmptyList() {
        when(startupRepository.findByFounderUserId("user-1")).thenReturn(java.util.Collections.emptyList());
        assertTrue(userService.manageMyStartup("user-1").isEmpty());
    }
}

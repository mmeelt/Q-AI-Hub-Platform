package tn.enicarthage.backend.service;

import tn.enicarthage.backend.dto.StartupMetricsRequest;
import tn.enicarthage.backend.dto.UpdateStartupRequest;
import tn.enicarthage.backend.entity.Startup;
import tn.enicarthage.backend.repository.StartupRepository;
import org.springframework.security.access.AccessDeniedException;
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
public class StartupServiceTest {

    @Mock
    private StartupRepository startupRepository;
    @Mock
    private tn.enicarthage.backend.repository.TeammateInvitationRepository invitationRepository;
    @Mock
    private tn.enicarthage.backend.repository.UserRepository userRepository;

    @InjectMocks
    private StartupService startupService;

    private Startup startup;

    @BeforeEach
    void setUp() {
        startup = Startup.builder()
                .startupId("startup-1")
                .founderUserId("user-1")
                .projectName("Test Project")
                .build();
    }

    @Test
    void updateStartupStatus_shouldUpdate() {
        when(startupRepository.findById("startup-1")).thenReturn(Optional.of(startup));
        startupService.updateStartupStatus("startup-1", Startup.StartupStatus.ACTIVE, "user-1");
        assertEquals(Startup.StartupStatus.ACTIVE, startup.getStartupStatus());
    }

    @Test
    void submitPitch_shouldNotThrow() {
        when(startupRepository.findById("startup-1")).thenReturn(Optional.of(startup));
        assertDoesNotThrow(() -> startupService.submitPitch("startup-1", null, "user-1"));
    }

    @Test
    void updateStartupProfile_ignoresNulls() {
        when(startupRepository.findById("startup-1")).thenReturn(Optional.of(startup));
        UpdateStartupRequest dto = new UpdateStartupRequest();
        dto.setProjectName("New Project");
        // other fields null

        startupService.updateStartupProfile("startup-1", dto, "user-1");
        
        assertEquals("New Project", startup.getProjectName());
        verify(startupRepository).save(startup);
    }

    @Test
    void updateStartupMetrics_success() {
        when(startupRepository.findById("startup-1")).thenReturn(Optional.of(startup));
        StartupMetricsRequest dto = new StartupMetricsRequest();
        dto.setMonthlyRevenue(java.math.BigDecimal.valueOf(5000));

        startupService.updateStartupMetrics("startup-1", dto, "user-1");
        
        assertEquals(java.math.BigDecimal.valueOf(5000), startup.getMonthlyRevenue());
        verify(startupRepository).save(startup);
    }

    @Test
    void nonFounderUpdates_throwsAccessDenied() {
        when(startupRepository.findById("startup-1")).thenReturn(Optional.of(startup));
        
        UpdateStartupRequest dto = new UpdateStartupRequest();
        assertThrows(AccessDeniedException.class, 
            () -> startupService.updateStartupProfile("startup-1", dto, "malicious-user"));
    }
}

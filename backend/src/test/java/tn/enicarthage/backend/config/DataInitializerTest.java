package tn.enicarthage.backend.config;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import tn.enicarthage.backend.repository.*;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DataInitializerTest {

    @Mock private UserRepository userRepository;
    @Mock private StartupRepository startupRepository;
    @Mock private AdminRepository adminRepository;
    @Mock private PlatformSettingRepository platformSettingRepository;
    @Mock private EventRepository eventRepository;
    @Mock private PhaseRepository phaseRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private PitchRoundRepository pitchRoundRepository;

    @InjectMocks
    private DataInitializer initializer;

    @Test
    void existingDatabase_isNeverModified() {
        lenient().when(userRepository.count()).thenReturn(15L);
        when(adminRepository.count()).thenReturn(1L);
        when(platformSettingRepository.count()).thenReturn(1L);
        lenient().when(eventRepository.count()).thenReturn(7L);

        initializer.run(null);

        verify(phaseRepository, never()).save(any());
        verify(userRepository, never()).save(any());
        verify(eventRepository, never()).save(any());
    }

    @Test
    void emptiedDatabase_withItsAdmin_staysEmpty() {
        // the admin emptied the platform on purpose: no demo user / startup / event comes back
        lenient().when(userRepository.count()).thenReturn(0L);
        when(adminRepository.count()).thenReturn(1L);
        when(platformSettingRepository.count()).thenReturn(1L);
        lenient().when(eventRepository.count()).thenReturn(0L);

        initializer.run(null);

        // no save, no update of phases / questions / pitch rounds on restart
        verify(phaseRepository, never()).save(any());
        verify(phaseRepository, never()).findAll();
        verify(pitchRoundRepository, never()).save(any());
        verify(userRepository, never()).save(any());
        verify(startupRepository, never()).save(any());
        verify(adminRepository, never()).save(any());
        verify(eventRepository, never()).save(any());
        verify(platformSettingRepository, never()).save(any());
    }

    @Test
    void emptyDatabase_getsTheDemoData() {
        when(passwordEncoder.encode(any())).thenReturn("hash");
        when(phaseRepository.save(any())).thenAnswer(a -> a.getArgument(0));

        initializer.run(null);

        verify(userRepository).save(any());
        verify(adminRepository).save(any());
        verify(eventRepository).save(any());
        verify(phaseRepository, times(3)).save(any());
        verify(pitchRoundRepository, times(2)).save(any());
    }
}

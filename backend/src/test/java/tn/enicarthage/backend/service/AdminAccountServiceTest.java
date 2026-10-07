package tn.enicarthage.backend.service;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import tn.enicarthage.backend.entity.Admin;
import tn.enicarthage.backend.entity.User;
import tn.enicarthage.backend.repository.AdminRepository;
import tn.enicarthage.backend.repository.UserRepository;
import tn.enicarthage.backend.security.InputSanitizer;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminAccountServiceTest {

    @Mock private AdminRepository adminRepository;
    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private EmailService emailService;
    @Mock private RefreshTokenService refreshTokenService;
    @Spy private InputSanitizer inputSanitizer = new InputSanitizer();

    @InjectMocks
    private AdminAccountService service;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(service, "frontendUrl", "http://localhost:5173");
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("admin_1", null, List.of()));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void createAdmin_savesIt_andEmailsASetPasswordLink_neverAPassword() {
        when(adminRepository.findByAdminEmail("new@test.com")).thenReturn(Optional.empty());
        when(userRepository.findByEmailAddress("new@test.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(any())).thenReturn("random-hash");
        when(adminRepository.save(any())).thenAnswer(a -> a.getArgument(0));
        when(adminRepository.findById("admin_1")).thenReturn(Optional.of(Admin.builder().adminId("admin_1").adminName("Meriem").build()));

        service.createAdmin(" Sara ", " New@Test.com ");

        ArgumentCaptor<Admin> cap = ArgumentCaptor.forClass(Admin.class);
        verify(adminRepository).save(cap.capture());
        assertEquals("new@test.com", cap.getValue().getAdminEmail());
        assertEquals("Sara", cap.getValue().getAdminName());
        verify(emailService).sendAdminAccountCreated("new@test.com", "Sara", "Meriem",
                "http://localhost:5173/forgot-password?email=new%40test.com");
    }

    @Test
    void createAdmin_refusesAnEmailUsedByAParticipant() {
        when(adminRepository.findByAdminEmail("user@test.com")).thenReturn(Optional.empty());
        when(userRepository.findByEmailAddress("user@test.com")).thenReturn(Optional.of(new User()));
        assertThrows(IllegalStateException.class, () -> service.createAdmin("X", "user@test.com"));
        verify(adminRepository, never()).save(any());
    }

    @Test
    void createAdmin_refusesAnExistingAdmin() {
        when(adminRepository.findByAdminEmail("a@test.com")).thenReturn(Optional.of(new Admin()));
        assertThrows(IllegalStateException.class, () -> service.createAdmin("X", "a@test.com"));
    }

    @Test
    void removeAdmin_cannotRemoveYourself() {
        assertThrows(IllegalStateException.class, () -> service.removeAdmin("admin_1"));
        verify(adminRepository, never()).delete(any());
    }

    @Test
    void removeAdmin_keepsAtLeastOneAdmin() {
        when(adminRepository.findById("admin_2")).thenReturn(Optional.of(Admin.builder().adminId("admin_2").build()));
        when(adminRepository.count()).thenReturn(1L);
        assertThrows(IllegalStateException.class, () -> service.removeAdmin("admin_2"));
    }

    @Test
    void removeAdmin_deletesIt_andRevokesItsSessions() {
        Admin other = Admin.builder().adminId("admin_2").adminEmail("b@test.com").build();
        when(adminRepository.findById("admin_2")).thenReturn(Optional.of(other));
        when(adminRepository.count()).thenReturn(2L);

        service.removeAdmin("admin_2");

        verify(refreshTokenService).revokeAllUserTokens("admin_2");
        verify(adminRepository).delete(other);
    }
}

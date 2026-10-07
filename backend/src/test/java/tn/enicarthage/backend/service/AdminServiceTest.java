package tn.enicarthage.backend.service;

import tn.enicarthage.backend.dto.AdminLoginRequest;
import tn.enicarthage.backend.entity.Admin;
import tn.enicarthage.backend.entity.User;
import tn.enicarthage.backend.repository.AdminRepository;
import tn.enicarthage.backend.repository.UserRepository;
import tn.enicarthage.backend.security.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AdminServiceTest {

    @Mock
    private AdminRepository adminRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private PlatformSettingService platformSettingService;
    @Mock
    private ExpertInvitationService expertInvitationService;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtUtil jwtUtil;
    @Mock
    private OtpService otpService;
    @Mock
    private RefreshTokenService refreshTokenService;

    @InjectMocks
    private AdminService adminService;

    private Admin admin;

    @BeforeEach
    void setUp() {
        admin = Admin.builder()
                .adminId("admin-1")
                .adminEmail("admin@test.com")
                .adminName("Admin User")
                .passwordHash("hashed")
                .build();
    }

    @Test
    void login_shouldReturnLoginPendingResponse() {
        AdminLoginRequest dto = new AdminLoginRequest();
        dto.setEmail("admin@test.com");
        dto.setPassword("pass");

        when(adminRepository.findByAdminEmail("admin@test.com")).thenReturn(Optional.of(admin));
        when(passwordEncoder.matches("pass", "hashed")).thenReturn(true);
        when(otpService.generateAndSendOtp("admin-1", "admin@test.com", "Admin User")).thenReturn("otp-session");

        tn.enicarthage.backend.dto.LoginPendingResponse res = adminService.login(dto);

        assertNotNull(res);
        assertTrue(res.getRequiresOtp());
        assertEquals("otp-session", res.getOtpSessionId());
    }

    @Test
    void manageUsers_shouldUpdateStatus() {
        User user = User.builder().userId("user-1").build();
        when(userRepository.findById("user-1")).thenReturn(Optional.of(user));
        
        adminService.manageUsers("suspend", "user-1");
        
        assertEquals(User.UserStatus.SUSPENDED, user.getUserStatus());
        verify(userRepository, times(1)).save(user);
    }

    @Test
    void inviteExpert_delegatesToExpertInvitationService() {
        adminService.inviteExpert("e@test.com", "JUDGE", "event-1");
        verify(expertInvitationService).inviteExpert("e@test.com", "JUDGE", "event-1");
    }

}

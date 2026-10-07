package tn.enicarthage.backend.service;

import tn.enicarthage.backend.dto.AdminLoginRequest;
import tn.enicarthage.backend.dto.PlatformSettingRequest;
import tn.enicarthage.backend.entity.Admin;
import tn.enicarthage.backend.entity.User;
import tn.enicarthage.backend.exception.InvalidCredentialsException;
import tn.enicarthage.backend.exception.ResourceNotFoundException;
import tn.enicarthage.backend.repository.AdminRepository;
import tn.enicarthage.backend.repository.UserRepository;
import tn.enicarthage.backend.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final AdminRepository adminRepository;
    private final UserRepository userRepository;
    private final PlatformSettingService platformSettingService;
    private final ExpertInvitationService expertInvitationService;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final OtpService otpService;
    private final RefreshTokenService refreshTokenService;

    @org.springframework.beans.factory.annotation.Value("${jwt.expiration}")
    private long accessTokenTtlMs;

    @org.springframework.transaction.annotation.Transactional
    public tn.enicarthage.backend.dto.LoginPendingResponse login(AdminLoginRequest dto) {
        Admin admin = adminRepository.findByAdminEmail(dto.getEmail())
                .orElseThrow(() -> new InvalidCredentialsException("Invalid email or password"));

        if (!passwordEncoder.matches(dto.getPassword(), admin.getPasswordHash())) {
            throw new InvalidCredentialsException("Invalid email or password");
        }

        String otpSessionId = otpService.generateAndSendOtp(admin.getAdminId(), admin.getAdminEmail(), admin.getAdminName());

        return tn.enicarthage.backend.dto.LoginPendingResponse.builder()
                .requiresOtp(true)
                .otpSessionId(otpSessionId)
                .message("Admin OTP sent to your email")
                .expiresIn(300)
                .build();
    }

    public tn.enicarthage.backend.dto.AuthResponse verifyOtp(tn.enicarthage.backend.dto.VerifyOtpRequest dto) {
        String adminId = otpService.validateOtp(dto.getOtpSessionId(), dto.getOtpCode());
        Admin admin = adminRepository.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin not found"));

        String token = jwtUtil.generateToken(admin.getAdminId(), admin.getAdminEmail(), "ADMIN");
        tn.enicarthage.backend.entity.RefreshToken rt = refreshTokenService.createRefreshToken(admin.getAdminId());

        return new tn.enicarthage.backend.dto.AuthResponse(
                token, 
                rt.getToken(), 
                accessTokenTtlMs / 1000, 
                admin.getAdminId(), 
                admin.getAdminEmail(), 
                "ADMIN",
                admin.getAdminName()
        );
    }

    public void inviteParticipant(String email, String message) {
        expertInvitationService.inviteParticipant(email, message);
    }

    public void inviteExpert(String email, String role, String eventId, String message) {
        expertInvitationService.inviteExpert(email, role, eventId, message);
    }

    public void inviteExpert(String email, String role, String eventId) {
        expertInvitationService.inviteExpert(email, role, eventId);
    }

    public void manageUsers(String action, String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        if ("activate".equalsIgnoreCase(action)) {
            user.setUserStatus(User.UserStatus.ACTIVE);
        } else if ("suspend".equalsIgnoreCase(action)) {
            user.setUserStatus(User.UserStatus.SUSPENDED);
        }
        userRepository.save(user);
    }

    public void updatePlatformSettings(PlatformSettingRequest dto) {
        platformSettingService.updatePlatformData(dto);
    }
}

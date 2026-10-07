package tn.enicarthage.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.enicarthage.backend.entity.Admin;
import tn.enicarthage.backend.exception.ResourceNotFoundException;
import tn.enicarthage.backend.repository.AdminRepository;
import tn.enicarthage.backend.repository.UserRepository;
import tn.enicarthage.backend.security.InputSanitizer;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Administrator accounts managed from the admin Settings page.
 * A new admin never receives a password by email: the account gets a random unusable password and
 * the email points to "Forgot password", where they choose their own (proving they own the inbox).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AdminAccountService {

    private final AdminRepository adminRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final InputSanitizer inputSanitizer;
    private final EmailService emailService;
    private final RefreshTokenService refreshTokenService;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    private final SecureRandom random = new SecureRandom();

    public List<Map<String, Object>> listAdmins() {
        String me = currentAdminId();
        return adminRepository.findAll().stream().map(a -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("adminId", a.getAdminId());
            m.put("name", a.getAdminName());
            m.put("email", a.getAdminEmail());
            m.put("lastSignInAt", a.getLastSignInAt());
            m.put("you", a.getAdminId().equals(me));
            return m;
        }).toList();
    }

    @Transactional
    public Map<String, Object> createAdmin(String name, String email) {
        String cleanEmail = inputSanitizer.sanitizeEmail(email);
        String cleanName = inputSanitizer.sanitize(name == null ? "" : name.trim());
        if (cleanName == null || cleanName.isBlank()) {
            throw new IllegalArgumentException("Please enter the administrator's name");
        }
        if (adminRepository.findByAdminEmail(cleanEmail).isPresent()) {
            throw new IllegalStateException("This email is already an administrator");
        }
        // Login looks for users first: the same email cannot be both a user and an admin
        if (userRepository.findByEmailAddress(cleanEmail).isPresent()) {
            throw new IllegalStateException("This email already belongs to a participant account. Use another email for the admin.");
        }

        byte[] secret = new byte[32];
        random.nextBytes(secret);
        Admin admin = adminRepository.save(Admin.builder()
                .adminId("admin_" + UUID.randomUUID())
                .adminName(cleanName)
                .adminEmail(cleanEmail)
                // random, never shown to anyone: the admin sets a real password through "Forgot password"
                .passwordHash(passwordEncoder.encode(Base64.getEncoder().encodeToString(secret)))
                .adminRole("ADMIN")
                .build());

        String base = frontendUrl.endsWith("/") ? frontendUrl.substring(0, frontendUrl.length() - 1) : frontendUrl;
        String link = base + "/forgot-password?email=" + URLEncoder.encode(cleanEmail, StandardCharsets.UTF_8);
        emailService.sendAdminAccountCreated(cleanEmail, cleanName, currentAdminName(), link);
        log.info("Admin account created for {} by {}", cleanEmail, currentAdminId());

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("adminId", admin.getAdminId());
        m.put("name", admin.getAdminName());
        m.put("email", admin.getAdminEmail());
        return m;
    }

    @Transactional
    public void removeAdmin(String adminId) {
        if (adminId.equals(currentAdminId())) {
            throw new IllegalStateException("You cannot remove your own administrator account");
        }
        Admin admin = adminRepository.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException("Administrator not found"));
        if (adminRepository.count() <= 1) {
            throw new IllegalStateException("The platform needs at least one administrator");
        }
        refreshTokenService.revokeAllUserTokens(adminId); // their sessions cannot be renewed
        adminRepository.delete(admin);
        log.info("Admin account {} removed by {}", admin.getAdminEmail(), currentAdminId());
    }

    private String currentAdminId() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        return auth == null ? null : auth.getName();
    }

    private String currentAdminName() {
        String id = currentAdminId();
        return id == null ? null : adminRepository.findById(id).map(Admin::getAdminName).orElse(null);
    }
}

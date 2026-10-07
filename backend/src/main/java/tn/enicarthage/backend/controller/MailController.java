package tn.enicarthage.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tn.enicarthage.backend.service.EmailService;
import tn.enicarthage.backend.service.JudgeAccessService;

import java.util.Map;

/** Admin tools for the email (SMTP) configuration. */
@RestController
@RequestMapping("/api/admin/mail")
@RequiredArgsConstructor
public class MailController {

    private final EmailService emailService;
    private final JudgeAccessService judgeAccess;

    // POST /api/admin/mail/test — sends a test message to the logged-in admin's own address
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/test")
    public ResponseEntity<Map<String, String>> sendTestEmail() {
        String to = judgeAccess.currentEmail();
        emailService.sendTestEmailNow(to);
        return ResponseEntity.ok(Map.of("message", "Test email sent to " + to));
    }
}

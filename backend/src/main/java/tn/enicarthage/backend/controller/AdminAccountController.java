package tn.enicarthage.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import tn.enicarthage.backend.service.AdminAccountService;

import java.util.List;
import java.util.Map;

/** Administrator accounts (admin Settings page). */
@RestController
@RequestMapping("/api/admin/admins")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminAccountController {

    private final AdminAccountService adminAccountService;

    record CreateAdminRequest(String name, String email) {}

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> list() {
        return ResponseEntity.ok(adminAccountService.listAdmins());
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody CreateAdminRequest body) {
        return ResponseEntity.ok(adminAccountService.createAdmin(body.name(), body.email()));
    }

    @DeleteMapping("/{adminId}")
    public ResponseEntity<Void> remove(@PathVariable String adminId) {
        adminAccountService.removeAdmin(adminId);
        return ResponseEntity.noContent().build();
    }
}

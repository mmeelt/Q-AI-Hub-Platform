package tn.enicarthage.backend.controller;

import tn.enicarthage.backend.dto.UpdateProfileRequest;
import tn.enicarthage.backend.dto.UserProfileResponse;
import tn.enicarthage.backend.entity.Startup;
import tn.enicarthage.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final tn.enicarthage.backend.service.AccountDeletionService accountDeletionService;

    @PutMapping("/profile")
    public ResponseEntity<Void> updateProfile(@RequestBody UpdateProfileRequest dto) {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        userService.updateProfile(userId, dto);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/profile")
    public ResponseEntity<UserProfileResponse> getProfile() {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(userService.getUserProfile(userId));
    }

    @GetMapping("/my-startup")
    public ResponseEntity<java.util.List<Startup>> getMyStartup() {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(userService.manageMyStartup(userId));
    }

    @PutMapping(value = "/notif-prefs", consumes = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<Void> updateNotifPrefs(@RequestBody String prefs) {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        userService.updateNotifPrefs(userId, prefs);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/me")
    public ResponseEntity<Void> deleteAccount() {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        accountDeletionService.deleteAccount(userId);
        return ResponseEntity.noContent().build();
    }
}

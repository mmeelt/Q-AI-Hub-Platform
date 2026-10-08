package tn.enicarthage.backend.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tn.enicarthage.backend.service.PlatformSettingService;

import java.util.Map;

/** Settings the public pages need (register page, event registration). No login required. */
@Tag(name = "Public", description = "Public platform information")
@RestController
@RequestMapping("/api/public/settings")
@RequiredArgsConstructor
public class PublicSettingsController {

    private final PlatformSettingService platformSettings;

    @GetMapping
    public ResponseEntity<Map<String, Object>> get() {
        return ResponseEntity.ok(Map.of(
                "allowPublicRegistrations", platformSettings.publicRegistrationsAllowed(),
                "allowLateSubmissions", platformSettings.lateSubmissionsAllowed()));
    }
}

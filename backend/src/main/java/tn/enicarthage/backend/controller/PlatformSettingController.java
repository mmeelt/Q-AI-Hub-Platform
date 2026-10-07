package tn.enicarthage.backend.controller;

import tn.enicarthage.backend.service.PlatformSettingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/settings")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class PlatformSettingController {


    private final PlatformSettingService platformSettingService;

    @PutMapping("/feature")
    public ResponseEntity<Void> toggleFeature(@RequestBody java.util.Map<String, Object> payload) {
        platformSettingService.toggleFeature((String) payload.get("key"), payload.get("value"));
        return ResponseEntity.ok().build();
    }

    @PostMapping("/question-bank")
    public ResponseEntity<Void> addQuestionToBank(@RequestBody Object questionData) {
        platformSettingService.addQuestionToBank(questionData);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/question-bank/{questionId}")
    public ResponseEntity<Void> removeQuestionFromBank(@PathVariable String questionId) {
        platformSettingService.removeQuestionFromBank(questionId);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/startup-form-fields")
    public ResponseEntity<Void> updateStartupFormFields(@RequestBody Object fields) {
        platformSettingService.updateStartupFormFields(fields);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/save")
    public ResponseEntity<Void> saveSettings() {
        platformSettingService.saveSettings();
        return ResponseEntity.ok().build();
    }

    @GetMapping
    public ResponseEntity<Object> getGlobalSettings() {
        return ResponseEntity.ok(platformSettingService.getGlobalSettings());
    }
}

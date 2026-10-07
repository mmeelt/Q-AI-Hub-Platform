package tn.enicarthage.backend.controller;

import tn.enicarthage.backend.dto.CreateStartupRequest;
import tn.enicarthage.backend.dto.StartupMetricsRequest;
import tn.enicarthage.backend.dto.UpdateStartupRequest;
import tn.enicarthage.backend.entity.Startup;
import tn.enicarthage.backend.service.StartupService;
import tn.enicarthage.backend.service.GeminiService;
import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/startups")
@RequiredArgsConstructor
public class StartupController {

    private final StartupService startupService;
    private final GeminiService geminiService;
    private final tn.enicarthage.backend.service.TeammateInvitationService teammateInvitationService;
    private final tn.enicarthage.backend.service.JudgeAccessService judgeAccess;

    @GetMapping("/my")
    public ResponseEntity<java.util.List<Startup>> getMyStartups() {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        
        // Startups founded by the user
        java.util.List<Startup> myStartups = new java.util.ArrayList<>(startupService.getStartupsByFounder(userId));
        
        // Startups where the user is an accepted teammate
        java.util.List<tn.enicarthage.backend.entity.TeammateInvitation> invitations = teammateInvitationService.getMyInvitations(userId);
        for (tn.enicarthage.backend.entity.TeammateInvitation inv : invitations) {
            if (inv.getStatus() == tn.enicarthage.backend.entity.TeammateInvitation.InvitationStatus.ACCEPTED) {
                startupService.getStartupById(inv.getStartupId()).ifPresent(startup -> {
                    // Avoid duplicates if the user is somehow both founder and invited
                    if (myStartups.stream().noneMatch(s -> s.getStartupId().equals(startup.getStartupId()))) {
                        myStartups.add(startup);
                    }
                });
            }
        }
        
        return ResponseEntity.ok(myStartups);
    }

    @PostMapping
    public ResponseEntity<Startup> createStartup(@RequestBody CreateStartupRequest dto) {
        String userId = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(startupService.createStartup(dto, userId));
    }

    // Full startup list (incl. financial metrics) is admin-only
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    @GetMapping
    public ResponseEntity<java.util.List<Startup>> getAllStartups() {
        return ResponseEntity.ok(startupService.getAllStartups());
    }

    @GetMapping("/{startupId}")
    public ResponseEntity<Startup> getStartupById(@PathVariable String startupId) {
        judgeAccess.assertCanViewStartup(startupId);
        return startupService.getStartupById(startupId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{startupId}")
    public ResponseEntity<Void> updateStartupProfile(@PathVariable String startupId,
            @RequestBody UpdateStartupRequest dto) {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        startupService.updateStartupProfile(startupId, dto, userId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{startupId}/description")
    public ResponseEntity<String> getActiveDescription(@PathVariable String startupId) {
        judgeAccess.assertCanViewStartup(startupId);
        return ResponseEntity.ok(startupService.getActiveDescription(startupId));
    }

    @PutMapping("/{startupId}/status")
    public ResponseEntity<Void> updateStatus(@PathVariable String startupId,
            @RequestBody java.util.Map<String, String> payload) {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        startupService.updateStartupStatus(startupId, Startup.StartupStatus.valueOf(payload.get("status")), userId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{startupId}/team-member")
    public ResponseEntity<Void> addTeamMember(@PathVariable String startupId,
            @RequestBody java.util.Map<String, String> payload) {
        String requesterId = SecurityContextHolder.getContext().getAuthentication().getName();
        startupService.addTeamMember(startupId, payload.get("userId"), requesterId);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{startupId}/funding")
    public ResponseEntity<Void> updateFundingAmount(@PathVariable String startupId,
            @RequestBody java.util.Map<String, Object> payload) {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        startupService.updateFundingAmount(startupId, new BigDecimal(payload.get("amount").toString()), userId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{startupId}/publish-update")
    public ResponseEntity<Void> publishStartupUpdate(@PathVariable String startupId, @RequestBody Object updateData) {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        startupService.publishStartupUpdate(startupId, updateData, userId);
        return ResponseEntity.ok().build();
    }



    @GetMapping("/{startupId}/teammates")
    public ResponseEntity<java.util.List<tn.enicarthage.backend.entity.TeammateInvitation>> getTeammates(@PathVariable String startupId) {
        judgeAccess.assertCanViewStartup(startupId);
        return ResponseEntity.ok(teammateInvitationService.getAcceptedTeammates(startupId));
    }

    @DeleteMapping("/{startupId}/teammates/{invitationId}")
    public ResponseEntity<Void> removeTeammate(@PathVariable String startupId, @PathVariable String invitationId) {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        teammateInvitationService.removeTeammate(invitationId, userId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/refine-description")
    public ResponseEntity<java.util.Map<String, String>> refineDescription(@RequestBody java.util.Map<String, String> payload) {
        String rawDescription = payload.get("description");
        if (rawDescription == null || rawDescription.isBlank()) {
            throw new IllegalArgumentException("Description is required");
        }
        if (rawDescription.length() > 5000) {
            throw new IllegalArgumentException("Description is too long (max 5000 characters)");
        }
        String prompt = "Refine the following startup description to make it professional, venture-ready, and impactful. " +
                        "Focus on the value proposition and innovation. Keep it within 3 sentences. No markdown: " + rawDescription;
        String refined = geminiService.getAiFeedback(prompt);
        return ResponseEntity.ok(java.util.Map.of("refinedDescription", refined));
    }
}

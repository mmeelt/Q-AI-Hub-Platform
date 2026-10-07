package tn.enicarthage.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import tn.enicarthage.backend.dto.InviteTeammateRequest;
import tn.enicarthage.backend.entity.TeammateInvitation;
import tn.enicarthage.backend.service.TeammateInvitationService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/team-invitations")
@RequiredArgsConstructor
public class TeammateInvitationController {

    private final TeammateInvitationService invitationService;

    private final tn.enicarthage.backend.service.JudgeAccessService judgeAccess;

    /**
     * POST /api/team-invitations — founder invites someone
     */
    @PostMapping
    public ResponseEntity<TeammateInvitation> invite(@RequestBody InviteTeammateRequest dto) {
        String inviterUserId = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(invitationService.invite(
            dto.getStartupId(), dto.getApplicationId(),
            inviterUserId, dto.getEmail(), dto.getRole(), dto.getPersonalMessage()
        ));
    }

    /**
     * GET /api/team-invitations/my — invited user sees their pending invites
     */
    @GetMapping("/my")
    public ResponseEntity<List<TeammateInvitation>> getMyInvitations() {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(invitationService.getMyInvitations(userId));
    }

    /**
     * PUT /api/team-invitations/{id}/respond — accept or decline
     */
    @PutMapping("/{id}/respond")
    public ResponseEntity<TeammateInvitation> respond(
            @PathVariable String id,
            @RequestBody Map<String, Boolean> body) {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        boolean accept = Boolean.TRUE.equals(body.get("accept"));
        return ResponseEntity.ok(invitationService.respond(id, userId, accept));
    }

    /**
     * GET /api/team-invitations/startup/{startupId} — get all invitations for a startup
     */
    @GetMapping("/startup/{startupId}")
    public ResponseEntity<List<TeammateInvitation>> getByStartup(@PathVariable String startupId) {
        judgeAccess.assertCanViewStartup(startupId);
        return ResponseEntity.ok(invitationService.getInvitationsByStartup(startupId));
    }
}

package tn.enicarthage.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;
import tn.enicarthage.backend.entity.PitchRound;
import tn.enicarthage.backend.entity.PitchRoundResult;
import tn.enicarthage.backend.service.JudgeAccessService;
import tn.enicarthage.backend.service.PitchRoundService;
import org.springframework.security.access.prepost.PreAuthorize;


import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Pitch rounds. Admins manage rounds; admins and the experts invited to the event judge them.
 * Judge access is checked per event (JudgeAccessService), not with a global role.
 */
@RestController
@RequestMapping("/api/pitch-rounds")
@RequiredArgsConstructor
public class PitchRoundController {

    private final PitchRoundService pitchRoundService;
    private final tn.enicarthage.backend.service.ApplicationService applicationService;
    private final JudgeAccessService judgeAccess;
    private final tn.enicarthage.backend.service.ApplicantAnonymizer anonymizer;

    // POST /api/pitch-rounds/phase/{phaseId}
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/phase/{phaseId}")
    public ResponseEntity<PitchRound> addRound(
            @PathVariable String phaseId,
            @RequestBody(required = false) AddRoundRequest request) {
        LocalDateTime date = request != null ? request.roundDate() : null;
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(pitchRoundService.addRound(phaseId, date));
    }

    // GET /api/pitch-rounds/{id}
    @GetMapping("/{id}")
    public ResponseEntity<PitchRound> getRoundById(@PathVariable Long id) {
        return ResponseEntity.ok(pitchRoundService.getRoundById(id));
    }

    // GET /api/pitch-rounds/phase/{phaseId}
    @GetMapping("/phase/{phaseId}")
    public ResponseEntity<List<PitchRound>> getRoundsByPhase(@PathVariable String phaseId) {
        return ResponseEntity.ok(pitchRoundService.getRoundsByPhase(phaseId));
    }

    // GET /api/pitch-rounds/phase/{phaseId}/eligible-applicants
    // Returns all applications that are ACCEPTED (eligible for pitch round evaluation)
    @GetMapping("/phase/{phaseId}/eligible-applicants")
    public ResponseEntity<List<Map<String, Object>>> getEligibleApplicants(@PathVariable String phaseId) {
        judgeAccess.assertCanJudgePhase(phaseId);
        return ResponseEntity.ok(pitchRoundService.getEligibleApplicants(phaseId));
    }

    // GET /api/pitch-rounds/{id}/candidates — startups that can be judged in this round
    @GetMapping("/{id}/candidates")
    public ResponseEntity<List<Map<String, Object>>> getCandidates(@PathVariable Long id) {
        judgeAccess.assertCanJudgeRound(pitchRoundService.getRoundById(id));
        List<Map<String, Object>> candidates = pitchRoundService.getRoundCandidates(id);
        if (anonymizer.appliesToJudgesOfEvent()) {
            candidates = candidates.stream().map(anonymizer::anonymize).toList();
        }
        return ResponseEntity.ok(candidates);
    }

    // PUT /api/pitch-rounds/{id}/criteria
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}/criteria")
    public ResponseEntity<PitchRound> updateCriteria(
            @PathVariable Long id,
            @RequestBody UpdateCriteriaRequest request) {
        return ResponseEntity.ok(pitchRoundService.updateCriteria(id, request.criteriaJson()));
    }

    // DELETE /api/pitch-rounds/{id}
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRound(@PathVariable Long id) {
        pitchRoundService.deleteRound(id);
        return ResponseEntity.noContent().build();
    }

    // POST /api/pitch-rounds/{id}/evaluate — the current judge's score (one per judge, editable)
    @PostMapping("/{id}/evaluate")
    public ResponseEntity<PitchRoundResult> evaluate(
            @PathVariable Long id,
            @RequestBody EvaluateRequest request) {
        judgeAccess.assertCanJudgeRound(pitchRoundService.getRoundById(id));
        PitchRoundResult result = pitchRoundService.evaluateParticipant(
                id,
                request.applicationId(),
                request.scoresJson(),
                request.decision(),
                request.feedback(),
                judgeAccess.currentEmail(), // never trust the evaluatedBy sent by the client
                request.aiFeedback()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    // GET /api/pitch-rounds/{id}/results — admin: every judge's evaluation; expert: only their own
    @GetMapping("/{id}/results")
    public ResponseEntity<List<PitchRoundResult>> getResults(@PathVariable Long id) {
        judgeAccess.assertCanJudgeRound(pitchRoundService.getRoundById(id));
        String judgeEmail = judgeAccess.isAdmin() ? null : judgeAccess.currentEmail();
        return ResponseEntity.ok(pitchRoundService.getResultsByRound(id, judgeEmail));
    }

    // GET /api/pitch-rounds/{id}/summary — per startup: all judges, average score, final decision
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/{id}/summary")
    public ResponseEntity<List<Map<String, Object>>> getSummary(@PathVariable Long id) {
        return ResponseEntity.ok(pitchRoundService.getRoundSummary(id));
    }

    // GET /api/pitch-rounds/application/{applicationId}/results
    // admin: all evaluations; judge of the event: their own; founder/teammate: averaged results once sent
    @GetMapping("/application/{applicationId}/results")
    public ResponseEntity<List<?>> getResultsByApplication(@PathVariable String applicationId) {
        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        boolean isAdmin = judgeAccess.isAdmin();
        var app = applicationService.getViewableApplication(applicationId, auth.getName(), isAdmin);
        if (isAdmin) {
            return ResponseEntity.ok(pitchRoundService.getResultsByApplication(applicationId, null));
        }
        if (judgeAccess.canJudgeEvent(app.getTargetEventId())) {
            return ResponseEntity.ok(pitchRoundService.getResultsByApplication(applicationId, judgeAccess.currentEmail()));
        }
        return ResponseEntity.ok(pitchRoundService.getPublishedResultsByApplication(applicationId));
    }

    // GET /api/pitch-rounds/{id}/passed — startups whose averaged final decision is PASSED
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/{id}/passed")
    public ResponseEntity<List<PitchRoundResult>> getPassed(@PathVariable Long id) {
        return ResponseEntity.ok(pitchRoundService.getPassedByRound(id));
    }

    // GET /api/pitch-rounds/{id}/ranking
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/{id}/ranking")
    public ResponseEntity<List<Map<String, Object>>> getRanking(@PathVariable Long id) {
        return ResponseEntity.ok(pitchRoundService.getRoundRanking(id));
    }

    // POST /api/pitch-rounds/{id}/send-results — email every evaluated startup its averaged result
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/{id}/send-results")
    public ResponseEntity<Map<String, Object>> sendResults(@PathVariable Long id) {
        return ResponseEntity.ok(pitchRoundService.sendBulkResults(id));
    }

    // POST /api/pitch-rounds/enhance-feedback
    @PostMapping("/enhance-feedback")
    public ResponseEntity<Map<String, String>> enhanceFeedback(@RequestBody EnhanceFeedbackRequest request) {
        if (!judgeAccess.isAdminOrExpert()) {
            throw new AccessDeniedException("Only admins and judges can use this feature");
        }
        String enhanced = pitchRoundService.enhanceFeedback(
                request.roundName(),
                request.scoresJson(),
                request.feedback()
        );
        return ResponseEntity.ok(Map.of("enhancedFeedback", enhanced));
    }

    record EnhanceFeedbackRequest(String roundName, String scoresJson, String feedback) {}

    record AddRoundRequest(LocalDateTime roundDate) {}

    record EvaluateRequest(
            String applicationId,
            String scoresJson,
            PitchRoundResult.RoundDecision decision,
            String feedback,
            String evaluatedBy,
            String aiFeedback
    ) {}

    record UpdateCriteriaRequest(String criteriaJson) {}
}

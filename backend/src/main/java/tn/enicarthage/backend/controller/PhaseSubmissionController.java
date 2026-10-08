package tn.enicarthage.backend.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import tn.enicarthage.backend.entity.PhaseSubmission;
import tn.enicarthage.backend.exception.ResourceNotFoundException;
import tn.enicarthage.backend.repository.ApplicationRepository;
import tn.enicarthage.backend.service.PhaseSubmissionService;
import org.springframework.security.access.prepost.PreAuthorize;

import java.util.List;
import java.util.Map;

@Tag(name = "Phase submissions", description = "Answers submitted for a phase, follow-up questions and decisions")
@RestController
@RequestMapping("/api/submissions")
@RequiredArgsConstructor
public class PhaseSubmissionController {

    private final PhaseSubmissionService submissionService;
    private final tn.enicarthage.backend.service.JudgeAccessService judgeAccess;
    private final ApplicationRepository applicationRepository;
    private final tn.enicarthage.backend.repository.PhaseRepository phaseRepository;

    // POST /api/submissions
    // Ownership and phase eligibility are enforced in PhaseSubmissionService.
    @PostMapping
    public ResponseEntity<PhaseSubmission> submitAnswers(@RequestBody SubmitRequest request) {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        PhaseSubmission submission = submissionService.submitAnswers(
                request.phaseId(),
                request.applicationId(),
                request.answersJson(),
                userId
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(submission);
    }

    // GET /api/submissions/{id}
    @GetMapping("/{id}")
    public ResponseEntity<tn.enicarthage.backend.dto.PhaseSubmissionResponse> getSubmissionById(@PathVariable Long id) {
        assertCanRead(id);
        return ResponseEntity.ok(submissionService.getSubmissionResponseById(id));
    }

    // GET /api/submissions/{id}/details
    @GetMapping("/{id}/details")
    public ResponseEntity<Map<String, Object>> getSubmissionDetails(@PathVariable Long id) {
        assertCanRead(id);
        return ResponseEntity.ok(submissionService.getSubmissionDetails(id));
    }

    // GET /api/submissions/phase/{phaseId}
    @PreAuthorize("isAuthenticated()") // + per-event judge check below
    @GetMapping("/phase/{phaseId}")
    public ResponseEntity<List<tn.enicarthage.backend.dto.PhaseSubmissionResponse>> getSubmissionsByPhase(@PathVariable String phaseId) {
        judgeAccess.assertCanJudgePhase(phaseId);
        return ResponseEntity.ok(submissionService.getSubmissionsByPhase(phaseId));
    }

    // GET /api/submissions/application/{applicationId}
    @GetMapping("/application/{applicationId}")
    public ResponseEntity<List<tn.enicarthage.backend.dto.PhaseSubmissionResponse>> getSubmissionsByApplication(
            @PathVariable String applicationId) {
        // Users can only view submissions of applications they participate in
        boolean judge = applicationRepository.findById(applicationId)
                .map(app -> judgeAccess.canJudgeEvent(app.getTargetEventId())).orElse(false);
        if (!judge) {
            String userId = SecurityContextHolder.getContext().getAuthentication().getName();
            submissionService.assertCanReadApplication(applicationId, userId);
        }
        return ResponseEntity.ok(submissionService.getSubmissionResponsesByApplication(applicationId));
    }

    // GET /api/submissions/phase/{phaseId}/graded
    @PreAuthorize("isAuthenticated()") // + per-event judge check below
    @GetMapping("/phase/{phaseId}/graded")
    public ResponseEntity<List<PhaseSubmission>> getGradedSubmissions(@PathVariable String phaseId) {
        judgeAccess.assertCanJudgePhase(phaseId);
        return ResponseEntity.ok(submissionService.getGradedSubmissions(phaseId));
    }

    // PUT /api/submissions/{id}/answers — startup updates their own answers
    @PutMapping("/{id}/answers")
    public ResponseEntity<PhaseSubmission> updateAnswers(
            @PathVariable Long id,
            @RequestBody String answersJson) {
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        return ResponseEntity.ok(submissionService.updateAnswers(id, answersJson, userId));
    }

    // PUT /api/submissions/{id}/grade
    @PreAuthorize("isAuthenticated()") // + per-event judge check below
    @PutMapping("/{id}/grade")
    public ResponseEntity<PhaseSubmission> gradeSubmission(
            @PathVariable Long id,
            @RequestBody GradeRequest request) {
        judgeAccess.assertCanJudgeSubmission(id);
        return ResponseEntity.ok(submissionService.gradeSubmission(
                id, request.score(), request.feedback()));
    }

    // GET /api/submissions/phase/{phaseId}/passed-count
    @PreAuthorize("isAuthenticated()") // + per-event judge check below
    @GetMapping("/phase/{phaseId}/passed-count")
    public ResponseEntity<Long> countPassedByPhase(@PathVariable String phaseId) {
        judgeAccess.assertCanJudgePhase(phaseId);
        return ResponseEntity.ok(submissionService.countPassedByPhase(phaseId));
    }

    // GET /api/submissions/phase/{phaseId}/draft-count
    @PreAuthorize("isAuthenticated()") // + per-event judge check below
    @GetMapping("/phase/{phaseId}/draft-count")
    public ResponseEntity<Long> countDraftByPhase(@PathVariable String phaseId) {
        judgeAccess.assertCanJudgePhase(phaseId);
        return ResponseEntity.ok(submissionService.countDraftByPhase(phaseId));
    }

    // PUT /api/submissions/{id}/decide
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}/decide")
    public ResponseEntity<tn.enicarthage.backend.dto.PhaseSubmissionResponse> decideSubmission(
            @PathVariable Long id,
            @RequestBody DecideRequest request) {
        PhaseSubmission decided = submissionService.decideSubmission(
                id, request.decision(), request.feedback());
        return ResponseEntity.ok(submissionService.getSubmissionResponseById(decided.getId()));
    }

    // GET /api/submissions/event/{eventId}/phase/{order}
    @PreAuthorize("isAuthenticated()") // + per-event judge check below
    @GetMapping("/event/{eventId}/phase/{order}")
    public ResponseEntity<List<tn.enicarthage.backend.dto.PhaseSubmissionResponse>> getByEventAndPhaseOrder(
            @PathVariable String eventId,
            @PathVariable Integer order) {
        judgeAccess.assertCanJudgeEvent(eventId);
        tn.enicarthage.backend.entity.Phase phase = phaseRepository.findByEventIdAndPhaseOrder(eventId, order)
                .orElseThrow(() -> new ResourceNotFoundException("Phase " + order + " not found for event " + eventId));
        return ResponseEntity.ok(submissionService.getSubmissionsByPhase(phase.getPhaseId()));
    }

    private boolean isStaff() {
        return judgeAccess.isAdmin();
    }

    private void assertCanRead(Long submissionId) {
        if (judgeAccess.canJudgeSubmission(submissionId)) return;
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        submissionService.assertCanRead(submissionId, userId);
    }

    // ── Request records ───────────────────────────────────────────

    record SubmitRequest(String phaseId, String applicationId, String answersJson) {}

    record GradeRequest(Double score, String feedback) {}

    record DecideRequest(PhaseSubmission.DecisionStatus decision, String feedback) {}
}

package tn.enicarthage.backend.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.enicarthage.backend.entity.PitchEvaluation;
import tn.enicarthage.backend.service.PitchEvaluationService;
import org.springframework.security.access.prepost.PreAuthorize;

@Tag(name = "Pitch evaluations", description = "Single-judge pitch evaluations")
@RestController
@RequestMapping("/api/evaluations")
public class PitchEvaluationController {

    @Autowired
    private PitchEvaluationService evaluationService;

    @Autowired
    private tn.enicarthage.backend.repository.PitchEvaluationRepository pitchEvaluationRepository;

    @Autowired
    private tn.enicarthage.backend.service.JudgeAccessService judgeAccess;

    @Autowired
    private tn.enicarthage.backend.repository.ApplicationRepository applicationRepository;

    // POST http://localhost:8081/api/evaluations/submit
    @PreAuthorize("hasAnyRole('ADMIN', 'JUDGE', 'EVALUATOR', 'MENTOR', 'TECHNICAL_EXPERT', 'FINANCE_EXPERT', 'FIELD_EXPERT')")
    @PostMapping("/submit")
    public ResponseEntity<PitchEvaluation> submitEvaluation(@RequestBody PitchEvaluation evaluation) {

        PitchEvaluation savedEval = evaluationService.submitEvaluation(evaluation);
        return ResponseEntity.ok(savedEval);
    }

    // Admins, or experts invited to the application's event
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/application/{applicationId}")
    public ResponseEntity<PitchEvaluation> getEvaluationByApplication(@PathVariable String applicationId) {
        applicationRepository.findById(applicationId)
                .ifPresent(app -> judgeAccess.assertCanJudgeEvent(app.getTargetEventId()));
        return pitchEvaluationRepository.findByApplicationId(applicationId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // Admins, or experts invited to this event
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/event/{eventId}")
    public ResponseEntity<java.util.List<PitchEvaluation>> getEvaluationSummaryByEvent(@PathVariable String eventId) {
        judgeAccess.assertCanJudgeEvent(eventId);
        // Fetch all applications for this event, then find their cumulative evaluations
        java.util.List<tn.enicarthage.backend.entity.Application> apps = applicationRepository.findByTargetEventId(eventId);
        java.util.List<PitchEvaluation> evaluations = apps.stream()
                .map(app -> pitchEvaluationRepository.findByApplicationId(app.getApplicationId()).orElse(null))
                .filter(java.util.Objects::nonNull)
                .collect(java.util.stream.Collectors.toList());
        return ResponseEntity.ok(evaluations);
    }
}

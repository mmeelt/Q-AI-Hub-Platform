package tn.enicarthage.backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import tn.enicarthage.backend.entity.PitchEvaluation;

import tn.enicarthage.backend.repository.PitchEvaluationRepository;
import tn.enicarthage.backend.entity.Startup;
import tn.enicarthage.backend.repository.StartupRepository;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class PitchEvaluationService {

    @Autowired
    private PitchEvaluationRepository evaluationRepository;

    @Autowired
    private tn.enicarthage.backend.repository.ApplicationRepository applicationRepository;

    @Autowired
    private tn.enicarthage.backend.repository.EventRepository eventRepository;

    @Autowired
    private tn.enicarthage.backend.repository.UserRepository userRepository;

    @Autowired
    private tn.enicarthage.backend.repository.AdminRepository adminRepository;
    
    @Autowired
    private StartupRepository startupRepository;

    @Autowired
    private GeminiService geminiService; // Inject our custom service!

    public PitchEvaluation submitEvaluation(PitchEvaluation evaluation) {
        // 0. Check for duplicates
        if (evaluationRepository.findByApplicationId(evaluation.getApplicationId()).isPresent()) {
            throw new IllegalStateException("Evaluation already submitted for this application");
        }

        // 1. Assignment check (Security)
        String userId = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        validateEvaluatorAssignment(evaluation.getApplicationId(), userId);

        // 2. Calculate the total score
        double total = 0;
        total += evaluation.getScoreTechnicalDepth() != null ? evaluation.getScoreTechnicalDepth() : 0;
        total += evaluation.getScoreBusinessModel() != null ? evaluation.getScoreBusinessModel() : 0;
        total += evaluation.getScoreOralPresentation() != null ? evaluation.getScoreOralPresentation() : 0;
        total += evaluation.getScoreMarketPotential() != null ? evaluation.getScoreMarketPotential() : 0;
        total += evaluation.getScoreTeamCapability() != null ? evaluation.getScoreTeamCapability() : 0;
        total += evaluation.getScoreInnovation() != null ? evaluation.getScoreInnovation() : 0;

        evaluation.setFinalTotalScore(total);

        // 3. Set Final Decision (Normalize to 100)
        double pct = (total / 60.0) * 100;
        if (pct >= 70) {
            evaluation.setFinalDecision("APPROVED");
        } else if (pct >= 50) {
            evaluation.setFinalDecision("WAITLISTED");
        } else {
            evaluation.setFinalDecision("REJECTED");
        }

        // 4. Generate REAL AI Feedback using our GeminiService!
        String aiPrompt = "You are a startup incubator judge. A startup just pitched. " +
                "They scored " + String.format("%.1f", total) + " out of 60 (" + String.format("%.1f", pct) + "%). " +
                "The human judge left these notes: '" + (evaluation.getEvaluatorNotes() != null ? evaluation.getEvaluatorNotes() : "No notes provided") + "'. " +
                "Write a short, professional, 2-sentence feedback for the startup explaining why they were " + evaluation.getFinalDecision() + ". Do not use markdown.";

        try {
            evaluation.setAiGeneratedFeedback(geminiService.getAiFeedback(aiPrompt));
        } catch (tn.enicarthage.backend.exception.AiUnavailableException e) {
            // The evaluation is still saved; it simply has no AI feedback
            log.warn("No AI feedback for evaluation of {}: {}", evaluation.getApplicationId(), e.getMessage());
        }

        // 5. Save to database
        evaluation.setEvaluatorAdminId(userId);
        PitchEvaluation saved = evaluationRepository.save(evaluation);

        // 6. Sync startup status if APPROVED
        if ("APPROVED".equals(saved.getFinalDecision())) {
            applicationRepository.findById(saved.getApplicationId()).ifPresent(app -> {
                if (app.getLinkedStartupId() != null) {
                    startupRepository.findById(app.getLinkedStartupId()).ifPresent(startup -> {
                        startup.setStartupStatus(Startup.StartupStatus.ACTIVE);
                        startupRepository.save(startup);
                        log.info("Startup {} status updated to ACTIVE due to APPROVED pitch evaluation", app.getLinkedStartupId());
                    });
                }
            });
        }

        return saved;
    }

    private void validateEvaluatorAssignment(String applicationId, String userId) {
        boolean isAdmin = org.springframework.security.core.context.SecurityContextHolder.getContext()
            .getAuthentication().getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        
        if (isAdmin) return; // Super admins can evaluate anything

        tn.enicarthage.backend.entity.Application app = applicationRepository.findById(applicationId)
            .orElseThrow(() -> new tn.enicarthage.backend.exception.ResourceNotFoundException("Application not found"));
        
        tn.enicarthage.backend.entity.Event event = eventRepository.findById(app.getTargetEventId())
            .orElseThrow(() -> new tn.enicarthage.backend.exception.ResourceNotFoundException("Event not found"));

        String userEmail = userRepository.findById(userId)
            .map(tn.enicarthage.backend.entity.User::getEmailAddress)
            .orElseGet(() -> adminRepository.findById(userId)
                .map(tn.enicarthage.backend.entity.Admin::getAdminEmail)
                .orElse(null));

        if (userEmail == null) {
            throw new org.springframework.security.access.AccessDeniedException("User email not found");
        }

        boolean isInvited = false;
        if (event.getExpertInvitations() != null) {
            isInvited = event.getExpertInvitations().stream()
                    .anyMatch(ei -> ei.getEmail().equalsIgnoreCase(userEmail));
        }

        if (!isInvited) {
            throw new org.springframework.security.access.AccessDeniedException("You are not assigned to this event as an expert");
        }
    }
}

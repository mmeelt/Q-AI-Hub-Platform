package tn.enicarthage.backend.service;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.enicarthage.backend.entity.Phase;
import tn.enicarthage.backend.entity.PhaseSubmission;
import tn.enicarthage.backend.repository.PhaseRepository;
import tn.enicarthage.backend.repository.PhaseSubmissionRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class PhaseSubmissionService {

    private final PhaseSubmissionRepository submissionRepository;
    private final PhaseRepository phaseRepository;
    private final NotificationService notificationService;
    private final tn.enicarthage.backend.repository.ApplicationRepository applicationRepository;
    private final tn.enicarthage.backend.repository.UserRepository userRepository;
    private final tn.enicarthage.backend.repository.StartupRepository startupRepository;
    private final EmailService emailService;
    private final tn.enicarthage.backend.repository.TeammateInvitationRepository teammateInvitationRepository;

    // ── SUBMIT ────────────────────────────────────────────────────

    /**
     * Stores the participant's answers for a phase. The result is always SUBMITTED + PENDING
     * ("pending review"): only an admin decision (decideSubmission) moves it to ACCEPTED/REJECTED.
     */
    @Transactional
    public PhaseSubmission submitAnswers(String phaseId, String applicationId, String answersJson, String userId) {
        Phase phase = phaseRepository.findById(phaseId)
                .orElseThrow(() -> new EntityNotFoundException("Phase not found with id: " + phaseId));
        tn.enicarthage.backend.entity.Application app = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new EntityNotFoundException("Application not found: " + applicationId));

        assertParticipant(app, userId);
        assertCanSubmit(phase, app);

        // Upsert: a DRAFT slot may already exist (Phase 2 slot created when Phase 1 is accepted)
        java.util.Optional<PhaseSubmission> existingOpt = submissionRepository
                .findByPhaseIdAndSourceApplicationId(phaseId, applicationId);

        if (existingOpt.isPresent()) {
            PhaseSubmission existing = existingOpt.get();
            assertNotReviewed(existing);
            existing.submitAnswers(answersJson);
            return submissionRepository.save(existing);
        }

        PhaseSubmission submission = PhaseSubmission.builder()
                .phase(phase)
                .sourceApplicationId(applicationId)
                .status(PhaseSubmission.SubmissionStatus.DRAFT)
                .decisionStatus(PhaseSubmission.DecisionStatus.PENDING)
                .submittedAt(LocalDateTime.now())
                .build();

        submission.submitAnswers(answersJson);
        return submissionRepository.save(submission);
    }

    // ── ELIGIBILITY (enforced server-side for every write) ────────

    /** The caller must be the applicant or an accepted teammate of the linked startup. */
    private void assertParticipant(tn.enicarthage.backend.entity.Application app, String userId) {
        if (userId != null && userId.equals(app.getApplicantUserId())) return;

        boolean isTeammate = app.getLinkedStartupId() != null && userRepository.findById(userId)
                .map(tn.enicarthage.backend.entity.User::getEmailAddress)
                .flatMap(email -> teammateInvitationRepository.findByStartupIdAndInviteeEmail(app.getLinkedStartupId(), email))
                .map(inv -> inv.getStatus() == tn.enicarthage.backend.entity.TeammateInvitation.InvitationStatus.ACCEPTED)
                .orElse(false);
        if (!isTeammate) {
            throw new AccessDeniedException("You are not authorized to submit answers for this application");
        }
    }

    /**
     * Application accepted → phase open → previous phase accepted by an admin.
     * Each step is a separate admin decision; none of them is implied by another.
     */
    /** Read access for non-staff users: only the participant(s) of the linked application. */
    public void assertCanRead(Long submissionId, String userId) {
        PhaseSubmission submission = getSubmissionById(submissionId);
        tn.enicarthage.backend.entity.Application app = applicationRepository.findById(submission.getSourceApplicationId())
                .orElseThrow(() -> new AccessDeniedException("You are not authorized to view this submission"));
        assertParticipant(app, userId);
    }

    public void assertCanReadApplication(String applicationId, String userId) {
        tn.enicarthage.backend.entity.Application app = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new EntityNotFoundException("Application not found: " + applicationId));
        assertParticipant(app, userId);
    }

    private void assertCanSubmit(Phase phase, tn.enicarthage.backend.entity.Application app) {
        if (!phase.getEventId().equals(app.getTargetEventId())) {
            throw new IllegalStateException("This phase does not belong to the event of your application");
        }
        if (!"ACCEPTED".equalsIgnoreCase(app.getApplicationStatus())) {
            throw new IllegalStateException("Your application is pending. Please wait for the administrator's decision.");
        }
        if (phase.getPhaseType() == Phase.PhaseType.PITCH) {
            throw new IllegalStateException("Pitch phases are evaluated in pitch rounds and do not accept answers");
        }
        if (Boolean.TRUE.equals(phase.getPhaseLocked())) {
            throw new IllegalStateException("This phase is locked and no longer accepts submissions");
        }
        if (!Boolean.TRUE.equals(phase.getPhaseActive())) {
            throw new IllegalStateException("This phase is not open yet. You will be notified when it opens.");
        }
        if (phase.getPhaseOrder() != null && phase.getPhaseOrder() > 1) {
            phaseRepository.findByEventIdAndPhaseOrder(phase.getEventId(), phase.getPhaseOrder() - 1)
                    .ifPresent(previous -> {
                        PhaseSubmission.DecisionStatus previousDecision = submissionRepository
                                .findByPhaseIdAndSourceApplicationId(previous.getPhaseId(), app.getApplicationId())
                                .filter(s -> s.getStatus() != PhaseSubmission.SubmissionStatus.DRAFT)
                                .map(PhaseSubmission::getOutcome)
                                .orElse(null);
                        if (previousDecision != PhaseSubmission.DecisionStatus.ACCEPTED) {
                            throw new IllegalStateException(previousDecision == PhaseSubmission.DecisionStatus.PENDING
                                    ? "Your " + previous.getPhaseName() + " submission is awaiting review."
                                    : "You must pass " + previous.getPhaseName() + " before accessing this phase.");
                        }
                    });
        }
    }

    /** Answers are final once submitted: only an untouched DRAFT slot can still be filled. */
    private void assertNotReviewed(PhaseSubmission submission) {
        if (submission.getDecisionStatus() != null && submission.getDecisionStatus() != PhaseSubmission.DecisionStatus.PENDING) {
            throw new IllegalStateException("This submission has already been reviewed: " + submission.getDecisionStatus());
        }
        if (submission.getStatus() != PhaseSubmission.SubmissionStatus.DRAFT) {
            throw new IllegalStateException("You have already submitted your answers for this phase. They can no longer be modified.");
        }
    }

    // ── READ ──────────────────────────────────────────────────────

    public PhaseSubmission getSubmissionById(Long id) {
        return submissionRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Submission not found with id: " + id));
    }

    @Transactional(readOnly = true)
    public List<tn.enicarthage.backend.dto.PhaseSubmissionResponse> getSubmissionsByPhase(String phaseId) {
        return submissionRepository.findByPhaseId(phaseId).stream()
                // Exclude auto-created DRAFT slots — admin only sees real submissions
                .filter(s -> s.getStatus() != PhaseSubmission.SubmissionStatus.DRAFT)
                .map(this::toResponse)
                .collect(java.util.stream.Collectors.toList());
    }

    private tn.enicarthage.backend.dto.PhaseSubmissionResponse toResponse(PhaseSubmission submission) {
        tn.enicarthage.backend.dto.PhaseSubmissionResponse.PhaseSubmissionResponseBuilder builder = tn.enicarthage.backend.dto.PhaseSubmissionResponse
                .builder()
                .id(submission.getId())
                .phaseId(submission.getPhase().getPhaseId())
                .sourceApplicationId(submission.getSourceApplicationId())
                .answersJson(submission.getAnswersJson())
                .evaluationScore(submission.getEvaluationScore())
                .evaluatorFeedback(submission.getEvaluatorFeedback())
                .status(submission.getStatus())
                .decisionStatus(submission.getDecisionStatus())
                .outcome(submission.getOutcome())
                .submittedAt(submission.getSubmittedAt())
                .phaseOrder(submission.getPhase().getPhaseOrder())
                .phaseActive(Boolean.TRUE.equals(submission.getPhase().getPhaseActive()));

        // Populate User and Startup Info
        applicationRepository.findById(submission.getSourceApplicationId()).ifPresentOrElse(app -> {
            tn.enicarthage.backend.dto.PhaseSubmissionResponse.UserInfo.UserInfoBuilder userBuilder = tn.enicarthage.backend.dto.PhaseSubmissionResponse.UserInfo
                    .builder();

            userRepository.findById(app.getApplicantUserId()).ifPresent(user -> {
                userBuilder.fullName(user.getFullName());
                userBuilder.emailAddress(user.getEmailAddress());
            });

            if (app.getLinkedStartupId() != null) {
                startupRepository.findById(app.getLinkedStartupId()).ifPresent(startup -> {
                    userBuilder.startupName(startup.getProjectName());
                });
            }
            builder.user(userBuilder.build());
        }, () -> {
            // Fallback for missing application
            builder.user(tn.enicarthage.backend.dto.PhaseSubmissionResponse.UserInfo.builder()
                    .fullName("Unknown Applicant")
                    .emailAddress("N/A")
                    .startupName("Unknown Startup")
                    .build());
        });

        return builder.build();
    }

    public List<PhaseSubmission> getSubmissionsByApplication(String applicationId) {
        return submissionRepository.findBySourceApplicationId(applicationId);
    }

    @Transactional(readOnly = true)
    public List<tn.enicarthage.backend.dto.PhaseSubmissionResponse> getSubmissionResponsesByApplication(String applicationId) {
        return submissionRepository.findBySourceApplicationId(applicationId).stream()
                .map(this::toResponse)
                .collect(java.util.stream.Collectors.toList());
    }

    public List<PhaseSubmission> getGradedSubmissions(String phaseId) {
        return submissionRepository.findByPhaseIdAndStatus(
                phaseId, PhaseSubmission.SubmissionStatus.GRADED);
    }

    public Map<String, Object> getSubmissionDetails(Long id) {
        return getSubmissionById(id).getSubmissionDetails();
    }

    // ── UPDATE ANSWERS ────────────────────────────────────────────

    @Transactional
    public PhaseSubmission updateAnswers(Long id, String answersJson, String userId) {
        PhaseSubmission submission = getSubmissionById(id);
        tn.enicarthage.backend.entity.Phase phase = submission.getPhase();
        tn.enicarthage.backend.entity.Application app = applicationRepository.findById(submission.getSourceApplicationId())
                .orElseThrow(() -> new EntityNotFoundException("Application not found: " + submission.getSourceApplicationId()));

        assertParticipant(app, userId);
        assertCanSubmit(phase, app);
        assertNotReviewed(submission);

        // Check if phase has questions configured
        if (phase.getPhaseOrder() != null && phase.getPhaseOrder() > 1) {
            if (phase.getFormFieldsJson() == null || phase.getFormFieldsJson().isBlank()) {
                throw new IllegalStateException(
                    "This phase has no questions configured yet. Please wait for the admin to set up the form.");
            }
        }

        boolean updated = submission.updateAnswers(answersJson);
        if (!updated) {
            throw new IllegalStateException("Cannot update answers — submission is already graded");
        }
        return submissionRepository.save(submission);
    }

    // ── GRADE ─────────────────────────────────────────────────────

    @Transactional
    public PhaseSubmission gradeSubmission(Long id, Double score, String feedback) {
        if (score < 0 || score > 100) {
            throw new IllegalArgumentException("Score must be between 0 and 100");
        }
        PhaseSubmission submission = getSubmissionById(id);
        submission.gradeSubmission(score, feedback);
        PhaseSubmission saved = submissionRepository.save(submission);

        // No message to the startup here: a grade is an internal step (it can come from a judge).
        // The startup is informed once, by the admin's decision (decideSubmission).

        return saved;
    }

    // ── STATS ─────────────────────────────────────────────────────

    public Long countPassedByPhase(String phaseId) {
        return submissionRepository.countPassedByPhaseId(phaseId);
    }

    public Long countDraftByPhase(String phaseId) {
        return submissionRepository.countDraftsByPhaseId(phaseId);
    }

    public tn.enicarthage.backend.dto.PhaseSubmissionResponse getSubmissionResponseById(Long id) {
        return toResponse(getSubmissionById(id));
    }

    @Transactional
    public PhaseSubmission decideSubmission(Long id, PhaseSubmission.DecisionStatus decision, String feedback) {
        PhaseSubmission submission = getSubmissionById(id);
        
        if (decision == null || decision == PhaseSubmission.DecisionStatus.PENDING) {
            throw new IllegalArgumentException("Decision must be ACCEPTED or REJECTED");
        }
        if (submission.getDecisionStatus() != PhaseSubmission.DecisionStatus.PENDING) {
            throw new IllegalStateException(
                "A decision has already been made for this submission: " + submission.getDecisionStatus());
        }
        if (submission.getStatus() == PhaseSubmission.SubmissionStatus.DRAFT) {
            throw new IllegalStateException("The participant has not submitted answers for this phase yet");
        }

        submission.setDecisionStatus(decision);
        if (feedback != null && !feedback.isBlank()) {
            submission.setEvaluatorFeedback(feedback);
        }
        submission.setStatus(PhaseSubmission.SubmissionStatus.GRADED);
        PhaseSubmission saved = submissionRepository.save(submission);

        // Notify startup
        applicationRepository.findById(submission.getSourceApplicationId()).ifPresent(app -> {
            boolean accepted = decision == PhaseSubmission.DecisionStatus.ACCEPTED;
            Phase phase = submission.getPhase();

            if (phase.getPhaseOrder() != null && phase.getPhaseOrder() == 1) {
                boolean hasNextPhase = phaseRepository.findByEventIdAndPhaseOrder(phase.getEventId(), 2).isPresent();
                notificationService.createNotification(
                        app.getApplicantUserId(),
                        accepted ? "Phase 1 passed" : "Phase 1 result",
                        accepted
                                ? (hasNextPhase
                                        ? "Congratulations! You have passed Phase 1 and can now participate in Phase 2."
                                        : "Congratulations! You have passed Phase 1.")
                                : "Your Phase 1 submission was not accepted."
                                        + (feedback != null && !feedback.isBlank() ? " Feedback: " + feedback : ""),
                        accepted ? "PHASE_ACCEPTED" : "PHASE_REJECTED",
                        "/dashboard?tab=applications");
                sendPhaseDecisionEmail(app, phase, accepted, feedback);
            } else {
                String label = "Phase " + phase.getPhaseOrder();
                notificationService.createNotification(
                        app.getApplicantUserId(),
                        accepted ? label + " passed" : label + " result",
                        accepted
                                ? "Congratulations! Your submission for " + phase.getPhaseName() + " has been accepted."
                                : "Your submission for " + phase.getPhaseName() + " was not selected."
                                        + (feedback != null && !feedback.isBlank() ? " Feedback: " + feedback : ""),
                        accepted ? "PHASE_ACCEPTED" : "PHASE_REJECTED",
                        "/dashboard?tab=applications");
                sendPhaseDecisionEmail(app, phase, accepted, feedback);
            }

            // Sync startup status if accepted
            if (accepted && app.getLinkedStartupId() != null) {
                startupRepository.findById(app.getLinkedStartupId()).ifPresent(startup -> {
                    startup.setStartupStatus(tn.enicarthage.backend.entity.Startup.StartupStatus.ACTIVE);
                    startupRepository.save(startup);
                    log.info("Startup {} status updated to ACTIVE due to phase submission acceptance", app.getLinkedStartupId());
                });
            }
        });

        // AUTO-ENROLL into Phase 2 when Phase 1 is accepted
        if (decision == PhaseSubmission.DecisionStatus.ACCEPTED && submission.getPhase().getPhaseOrder() == 1) {
            applicationRepository.findById(submission.getSourceApplicationId()).ifPresent(app -> {
                if (app.getTargetEventId() != null) {
                    phaseRepository.findByEventIdAndPhaseOrder(app.getTargetEventId(), 2).ifPresent(phase2 -> {
                        boolean alreadyEnrolled = submissionRepository
                            .findByPhaseIdAndSourceApplicationId(phase2.getPhaseId(), submission.getSourceApplicationId())
                            .isPresent();
                        if (!alreadyEnrolled) {
                            PhaseSubmission phase2Sub = PhaseSubmission.builder()
                                .phase(phase2)
                                .sourceApplicationId(submission.getSourceApplicationId())
                                .status(PhaseSubmission.SubmissionStatus.DRAFT)
                                .decisionStatus(PhaseSubmission.DecisionStatus.PENDING)
                                .submittedAt(LocalDateTime.now())
                                .build();
                            submissionRepository.save(phase2Sub);
                            log.info("Auto-enrolled application {} into Phase 2", submission.getSourceApplicationId());
                        }
                    });
                }
            });
        }

        return saved;
    }

    private void sendPhaseDecisionEmail(tn.enicarthage.backend.entity.Application app, Phase phase,
                                        boolean accepted, String feedback) {
        try {
            userRepository.findById(app.getApplicantUserId()).ifPresent(user -> {
                String startupName = app.getLinkedStartupId() != null
                        ? startupRepository.findById(app.getLinkedStartupId())
                            .map(s -> s.getProjectName()).orElse("your startup")
                        : "your startup";
                emailService.sendPhaseDecision(user.getEmailAddress(), startupName, phase.getPhaseName(),
                        accepted ? "ACCEPTED" : "REJECTED", feedback);
            });
        } catch (Exception e) {
            log.error("Failed to send phase decision email: {}", e.getMessage());
        }
    }
}

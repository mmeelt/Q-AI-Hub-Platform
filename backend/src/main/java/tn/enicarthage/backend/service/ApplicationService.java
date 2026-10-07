package tn.enicarthage.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.enicarthage.backend.entity.Application;
import tn.enicarthage.backend.entity.Startup;
import tn.enicarthage.backend.entity.User;
import tn.enicarthage.backend.exception.ResourceNotFoundException;
import tn.enicarthage.backend.repository.ApplicationRepository;
import tn.enicarthage.backend.repository.StartupRepository;
import tn.enicarthage.backend.repository.UserRepository;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ApplicationService {

    private final ApplicationRepository applicationRepository;
    private final StartupRepository startupRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final NotificationService notificationService;
    private final TeammateInvitationService teammateInvitationService;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;
    private final tn.enicarthage.backend.repository.EventRepository eventRepository;
    private final tn.enicarthage.backend.repository.EventRegistrationRepository eventRegistrationRepository;
    private final tn.enicarthage.backend.repository.AdminRepository adminRepository;
    private final tn.enicarthage.backend.repository.TeammateInvitationRepository teammateInvitationRepository;
    private final PlatformSettingService platformSettings;

    // ── SUBMIT ────────────────────────────────────────────────────


    @Transactional
    public Application submitApplication(Application newApplication, String userId) {
        // Derive applicantUserId from security context to prevent spoofing
        newApplication.setApplicantUserId(userId);

        // 1. Prevent duplicate applications for the same event
        if (applicationRepository.existsByApplicantUserIdAndTargetEventId(userId, newApplication.getTargetEventId())) {
            throw new IllegalArgumentException("You have already submitted an application for this event. Please track your existing application instead.");
        }

        // 1b. The event must be an open incubation event (SIMPLE events use /api/registrations)
        tn.enicarthage.backend.entity.Event targetEvent = eventRepository.findById(newApplication.getTargetEventId())
                .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + newApplication.getTargetEventId()));
        if (targetEvent.getEventType() == tn.enicarthage.backend.entity.Event.EventType.SIMPLE) {
            throw new IllegalStateException("This event uses simple registration, no startup application is needed");
        }
        if (targetEvent.getStatus() != tn.enicarthage.backend.entity.Event.EventStatus.ACTIVE) {
            throw new IllegalStateException("Applications are closed for this event");
        }
        // Past the deadline: only accepted when the admin allows late submissions
        if (!targetEvent.isOpenForApplications() && !platformSettings.lateSubmissionsAllowed()) {
            throw new IllegalStateException("The application deadline for this event has passed");
        }

        // 2. Verify startup ownership
        if (newApplication.getLinkedStartupId() != null) {
            Startup startup = startupRepository.findById(newApplication.getLinkedStartupId())
                .orElseThrow(() -> new ResourceNotFoundException("Startup not found"));
            if (!startup.getFounderUserId().equals(userId)) {
                throw new AccessDeniedException("You do not own this startup");
            }
        } else {
            throw new IllegalArgumentException("A linked startup is required for this application");
        }

        String trackingCode = "APP-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        newApplication.setTrackingCode(trackingCode);

        // Validate required fields in JSON
        try {
            if (newApplication.getInitialApplicationAnswers() != null) {
                java.util.Map<String, Object> answers = objectMapper.readValue(newApplication.getInitialApplicationAnswers(), java.util.Map.class);
                validateField(answers, "rawDescription", "Pitch/Description");
                // Make logo and video optional to avoid blocking submissions if they aren't provided
                // but still ensure the pitch is there.
                // validateField(answers, "companyLogoUrl", "Logo URL");
                // validateField(answers, "pitchVideoLink", "Video URL");
            } else {
                throw new IllegalArgumentException("Application content cannot be empty");
            }
        } catch (Exception e) {
            if (e instanceof IllegalArgumentException) throw (IllegalArgumentException) e;
            log.error("JSON parse error during validation", e);
            throw new IllegalArgumentException("Invalid application content format");
        }

        newApplication.setApplicationStatus("PENDING");
        Application saved = applicationRepository.save(newApplication);

        // Notify teammates via the invitation service
        try {
            if (saved.getInitialApplicationAnswers() != null) {
                java.util.Map<String, Object> answers = objectMapper.readValue(saved.getInitialApplicationAnswers(), java.util.Map.class);
                if (answers.containsKey("teammates")) {
                    List<java.util.Map<String, String>> teammates = (List<java.util.Map<String, String>>) answers.get("teammates");
                    if (teammates != null) {
                        for (java.util.Map<String, String> tm : teammates) {
                            String tmEmail = tm.get("email");
                            String tmRole = tm.get("role");
                            if (tmEmail != null && !tmEmail.isBlank()) {
                                try { // one refused teammate (duplicate, own email...) must not block the others
                                    teammateInvitationService.invite(
                                        saved.getLinkedStartupId(),
                                        saved.getApplicationId(),
                                        userId,
                                        tmEmail,
                                        tmRole,
                                        null
                                    );
                                } catch (RuntimeException ex) {
                                    log.info("Teammate {} not invited: {}", tmEmail, ex.getMessage());
                                }
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to process teammate invitations", e);
        }

        // The application stays PENDING until an admin explicitly accepts or rejects it.
        return saved;
    }

    // ── ACCEPT ─── event participation only (not a phase decision) ─

    /**
     * Accepts the user as a participant of the event. This does NOT create or accept any phase
     * submission: Phase 1 opens separately (PhaseService.activatePhase) and each phase submission
     * is decided on its own (PhaseSubmissionService.decideSubmission).
     */
    @Transactional
    public Application acceptApplication(String applicationId) {
        Application app = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found: " + applicationId));

        if (!"PENDING".equalsIgnoreCase(app.getApplicationStatus())) {
            throw new IllegalStateException("This application has already been reviewed: " + app.getApplicationStatus());
        }

        app.setApplicationStatus("ACCEPTED");
        applicationRepository.save(app);

        // Send acceptance email
        sendAcceptanceEmail(app);

        // In-app notification
        notificationService.createNotification(
            app.getApplicantUserId(),
            "Application Accepted",
            "Your application to " + resolveEventTitle(app) + " has been accepted. "
                + "You will be notified when Phase 1 opens.",
            "APPLICATION_ACCEPTED",
            "/dashboard?tab=applications"
        );

        // Update linked startup status to ACTIVE
        if (app.getLinkedStartupId() != null) {
            startupRepository.findById(app.getLinkedStartupId()).ifPresent(startup -> {
                startup.setStartupStatus(Startup.StartupStatus.ACTIVE);
                startupRepository.save(startup);
                log.info("Startup {} status updated to ACTIVE due to application acceptance", app.getLinkedStartupId());
            });
        }

        return app;
    }


    // ── REJECT ─── send empathetic email ──────────────────────────

    @Transactional
    public Application rejectApplication(String applicationId, String reason) {
        Application app = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found: " + applicationId));

        if (!"PENDING".equalsIgnoreCase(app.getApplicationStatus())) {
            throw new IllegalStateException("This application has already been reviewed: " + app.getApplicationStatus());
        }

        app.setApplicationStatus("REJECTED");
        app.setRejectionReason(reason);
        applicationRepository.save(app);

        // Send rejection email
        sendRejectionEmail(app, reason);

        // In-app notification
        notificationService.createNotification(
            app.getApplicantUserId(),
            "Application Update",
            "Your application to " + resolveEventTitle(app) + " was not accepted."
                + (reason != null && !reason.isBlank() ? " Feedback: " + reason : ""),
            "APPLICATION_REJECTED",
            "/dashboard?tab=applications"
        );

        // Update linked startup status to INACTIVE
        if (app.getLinkedStartupId() != null) {
            startupRepository.findById(app.getLinkedStartupId()).ifPresent(startup -> {
                startup.setStartupStatus(Startup.StartupStatus.INACTIVE);
                startupRepository.save(startup);
                log.info("Startup {} status updated to INACTIVE due to application rejection", app.getLinkedStartupId());
            });
        }

        return app;
    }

    public Application schedulePitch(String applicationId, Date pitchDate) {
        Application app = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found"));

        app.setPitchDate(pitchDate);
        applicationRepository.save(app);

        // Notify user
        notificationService.createNotification(
            app.getApplicantUserId(),
            "Pitch Scheduled",
            "Your pitch has been scheduled for " + pitchDate.toString(),
            "PITCH_SCHEDULED"
        );

        return app;
    }

    // ── READ ──────────────────────────────────────────────────────

    public List<Application> getApplicationsByEvent(String eventId) {
        String userId = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        String userEmail = resolveRequesterEmail(userId);
        boolean isAdmin = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        
        tn.enicarthage.backend.entity.Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new tn.enicarthage.backend.exception.ResourceNotFoundException("Event not found"));

        if (!isAdmin) {
            if (userEmail == null || userEmail.isBlank()) {
                throw new org.springframework.security.access.AccessDeniedException("Unable to resolve expert email for access check");
            }
            if (!isInvitedExpert(event, userEmail)) {
                throw new org.springframework.security.access.AccessDeniedException("You are not assigned to this event as an expert");
            }
        }
        
        List<Application> apps = new ArrayList<>(applicationRepository.findByTargetEventId(eventId));
        
        // If event is SIMPLE, also fetch EventRegistrations and convert them to Application entities for display
        if (event.getEventType() == tn.enicarthage.backend.entity.Event.EventType.SIMPLE) {
            List<tn.enicarthage.backend.entity.EventRegistration> regs = eventRegistrationRepository.findByEventId(eventId);
            for (tn.enicarthage.backend.entity.EventRegistration reg : regs) {
                // Convert Registration to a mock Application for the UI
                Application mockApp = Application.builder()
                        .applicationId("REG-" + reg.getId())
                        .applicantUserId(reg.getParticipantEmail()) // Use email as ID for simple events
                        .targetEventId(eventId)
                        .applicationStatus("Registered")
                        .applicationSubmittedAt(reg.getRegisteredAt() != null ? java.sql.Timestamp.valueOf(reg.getRegisteredAt()) : new java.util.Date())
                        .initialApplicationAnswers(reg.getAnswersJson())
                        .build();
                apps.add(mockApp);
            }
        }

        return apps;
    }

    // ── ACCESS CONTROL ────────────────────────────────────────────

    public boolean isInvitedExpert(tn.enicarthage.backend.entity.Event event, String email) {
        return email != null && event.getExpertInvitations() != null && event.getExpertInvitations().stream()
                .anyMatch(ei -> ei.getEmail() != null && ei.getEmail().equalsIgnoreCase(email));
    }

    private boolean isAcceptedTeammate(Application app, String email) {
        return app.getLinkedStartupId() != null && email != null && teammateInvitationRepository
                .findByStartupIdAndInviteeEmail(app.getLinkedStartupId(), email)
                .map(inv -> inv.getStatus() == tn.enicarthage.backend.entity.TeammateInvitation.InvitationStatus.ACCEPTED)
                .orElse(false);
    }

    /**
     * Who may read an application and its related data (teammates, ratings, pitch results):
     * the applicant, an accepted teammate, an admin, or an expert invited to the event.
     */
    public boolean canView(Application app, String requesterId, boolean isAdmin) {
        if (isAdmin) return true;
        if (requesterId != null && requesterId.equals(app.getApplicantUserId())) return true;
        String email = resolveRequesterEmail(requesterId);
        if (isAcceptedTeammate(app, email)) return true;
        return app.getTargetEventId() != null && eventRepository.findById(app.getTargetEventId())
                .map(event -> isInvitedExpert(event, email))
                .orElse(false);
    }

    public Application getViewableApplication(String applicationId, String requesterId, boolean isAdmin) {
        Application app = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found: " + applicationId));
        if (!canView(app, requesterId, isAdmin)) {
            throw new AccessDeniedException("You are not authorized to access this application");
        }
        return app;
    }

    public String resolveRequesterEmail(String requesterId) {
        if (requesterId == null || requesterId.isBlank()) return null;

        // Our authentication name is usually the UUID userId/adminId, not the email.
        return userRepository.findById(requesterId)
                .map(User::getEmailAddress)
                .orElseGet(() -> adminRepository.findById(requesterId)
                        .map(tn.enicarthage.backend.entity.Admin::getAdminEmail)
                        .orElse(requesterId)); // fallback if the auth name is already an email
    }

    // ── Private email helpers ─────────────────────────────────────

    private void sendAcceptanceEmail(Application app) {
        try {
            String startupName = resolveStartupName(app);
            String applicantEmail = resolveApplicantEmail(app);
            if (applicantEmail != null) {
                emailService.sendApplicationAccepted(applicantEmail, startupName, app.getTrackingCode());
            }
        } catch (Exception e) {
            log.error("Failed to send acceptance email for application {}: {}", app.getApplicationId(), e.getMessage());
        }
    }

    private void sendRejectionEmail(Application app, String reason) {
        try {
            String startupName = resolveStartupName(app);
            String applicantEmail = resolveApplicantEmail(app);
            if (applicantEmail != null) {
                emailService.sendApplicationRejected(applicantEmail, startupName, reason);
            }
        } catch (Exception e) {
            log.error("Failed to send rejection email for application {}: {}", app.getApplicationId(), e.getMessage());
        }
    }

    private String resolveStartupName(Application app) {
        if (app.getLinkedStartupId() != null) {
            return startupRepository.findById(app.getLinkedStartupId())
                .map(Startup::getProjectName)
                .orElse("your startup");
        }
        return "your startup";
    }

    private String resolveEventTitle(Application app) {
        if (app.getTargetEventId() == null) return "the event";
        return eventRepository.findById(app.getTargetEventId())
                .map(tn.enicarthage.backend.entity.Event::getTitle)
                .orElse("the event");
    }

    private String resolveApplicantEmail(Application app) {
        if (app.getApplicantUserId() != null) {
            return userRepository.findById(app.getApplicantUserId())
                .map(User::getEmailAddress)
                .orElse(null);
        }
        return null;
    }

    private void validateField(java.util.Map<String, Object> answers, String key, String label) {
        Object val = answers.get(key);
        if (val == null || val.toString().trim().isEmpty()) {
            throw new IllegalArgumentException(label + " is required");
        }
    }
}

package tn.enicarthage.backend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.enicarthage.backend.entity.Application;
import tn.enicarthage.backend.dto.ApplicationResponse;
import tn.enicarthage.backend.dto.SchedulePitchRequest;

import tn.enicarthage.backend.service.ApplicationService;
import tn.enicarthage.backend.repository.ApplicationRepository;
import tn.enicarthage.backend.repository.EventRepository;
import tn.enicarthage.backend.repository.StartupRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import tn.enicarthage.backend.service.NotificationService;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/api/applications")
public class ApplicationController {

    @Autowired
    private tn.enicarthage.backend.service.ApplicantAnonymizer anonymizer;

    @Autowired
    private ApplicationService applicationService;

    @Autowired
    private ApplicationRepository applicationRepository;

    @Autowired
    private tn.enicarthage.backend.repository.EventRepository eventRepository;

    @Autowired
    private StartupRepository startupRepository;

    @Autowired
    private tn.enicarthage.backend.repository.EventRegistrationRepository eventRegistrationRepository;

    @Autowired
    private tn.enicarthage.backend.repository.PhaseRepository phaseRepository;

    @Autowired
    private tn.enicarthage.backend.repository.PitchEvaluationRepository pitchEvaluationRepository;

    @Autowired
    private tn.enicarthage.backend.repository.UserRepository userRepository;

    @Autowired
    private tn.enicarthage.backend.repository.TeammateInvitationRepository teammateInvitationRepository;

    @Autowired
    private com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    @Autowired
    private NotificationService notificationService;

    // POST /api/applications/submit — participants only (admins manage applications, they don't apply)
    @PreAuthorize("isAuthenticated() and !hasRole('ADMIN')")
    @PostMapping("/submit")
    // Only the fields a founder may set are bound; id, status, tracking code etc. are server-side.
    public ResponseEntity<Application> submitApplication(@RequestBody SubmitApplicationRequest request) {
        String userId = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication()
                .getName();
        Application application = Application.builder()
                .targetEventId(request.targetEventId())
                .linkedStartupId(request.linkedStartupId())
                .initialApplicationAnswers(request.initialApplicationAnswers())
                .build();
        return ResponseEntity.ok(applicationService.submitApplication(application, userId));
    }

    record SubmitApplicationRequest(String targetEventId, String linkedStartupId, String initialApplicationAnswers) {}

    // GET /api/applications/track/{trackingCode}
    @GetMapping("/track/{trackingCode}")
    public ResponseEntity<?> trackApplication(@PathVariable String trackingCode) {
        if (trackingCode.startsWith("REG-")) {
            try {
                Long id = Long.parseLong(trackingCode.substring(4));
                java.util.Optional<tn.enicarthage.backend.entity.EventRegistration> regOpt = eventRegistrationRepository.findById(id);
                if (regOpt.isPresent()) {
                    tn.enicarthage.backend.entity.EventRegistration reg = regOpt.get();
                    Map<String, Object> response = new java.util.HashMap<>();
                    response.put("trackingCode", trackingCode);
                    response.put("status", "Registered");
                    response.put("currentPhase", "Registration Confirmed");
                    response.put("nextStep", "Wait for event details");
                    response.put("submittedAt", reg.getRegisteredAt());
                    response.put("lastUpdated", reg.getRegisteredAt());
                    response.put("projectName", reg.getEvent() != null ? reg.getEvent().getTitle() : "Event Registration");
                    response.put("eventType", "SIMPLE");
                    return ResponseEntity.ok(response);
                } else {
                    return ResponseEntity.status(404).body("Registration not found with code: " + trackingCode);
                }
            } catch (Exception e) {
                return ResponseEntity.status(400).body("Invalid tracking code format");
            }
        }

        Optional<Application> app = applicationRepository.findByTrackingCode(trackingCode);
        if (app.isPresent()) {
            Application a = app.get();
            Map<String, Object> response = new java.util.HashMap<>();
            response.put("trackingCode", a.getTrackingCode());
            String status = a.getApplicationStatus() == null ? "PENDING" : a.getApplicationStatus().toUpperCase();
            response.put("status", status);
            switch (status) {
                case "ACCEPTED" -> {
                    // the phase currently open for this event, if any
                    String phase = phaseRepository.findByEventIdAndPhaseActiveTrue(a.getTargetEventId())
                            .map(tn.enicarthage.backend.entity.Phase::getPhaseName).orElse("Accepted to the program");
                    response.put("currentPhase", phase);
                    response.put("nextStep", "Log in to your dashboard to follow the next steps");
                }
                case "REJECTED" -> {
                    response.put("currentPhase", "Not selected");
                    response.put("nextStep", "Thank you for applying. Watch the events page for new opportunities");
                }
                default -> {
                    response.put("currentPhase", "Application under review");
                    response.put("nextStep", "The team is reviewing your application. You will be notified by email");
                }
            }
            response.put("submittedAt", a.getApplicationSubmittedAt());
            response.put("lastUpdated", a.getApplicationSubmittedAt());
            eventRepository.findById(a.getTargetEventId()).ifPresent(e -> response.put("eventTitle", e.getTitle()));
            response.put("projectName",
                    startupRepository.findById(a.getLinkedStartupId()).map(s -> s.getProjectName()).orElse("Unknown"));
            response.put("eventType", "INCUBATION");
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.status(404).body("Application not found with code: " + trackingCode);
        }
    }

    // GET /api/applications/event/{eventId}
    // Admins, or experts invited to this event (checked in ApplicationService.getApplicationsByEvent)
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/event/{eventId}")
    public ResponseEntity<List<ApplicationResponse>> getApplicationsByEvent(@PathVariable String eventId) {
        List<Application> apps = applicationService.getApplicationsByEvent(eventId);
        // Load the event, startups and founders once (instead of 3 queries per application)
        String eventTitle = eventRepository.findById(eventId).map(e -> e.getTitle()).orElse("Unknown Event");
        Map<String, String> startupNames = new java.util.HashMap<>();
        startupRepository.findAllById(apps.stream().map(Application::getLinkedStartupId)
                        .filter(java.util.Objects::nonNull).distinct().toList())
                .forEach(st -> startupNames.put(st.getStartupId(), st.getProjectName()));
        Map<String, tn.enicarthage.backend.entity.User> founders = new java.util.HashMap<>();
        userRepository.findAllById(apps.stream().map(Application::getApplicantUserId)
                        .filter(java.util.Objects::nonNull).distinct().toList())
                .forEach(u -> founders.put(u.getUserId(), u));

        List<ApplicationResponse> responses = apps.stream().map(app -> {

            String startupName = "Unknown Startup";
            // For SIMPLE event registrations (mocked as REG-...), we try to find the registration for the name
            if (app.getApplicationId() != null && app.getApplicationId().startsWith("REG-")) {
                try {
                    Long regId = Long.parseLong(app.getApplicationId().substring(4));
                    startupName = eventRegistrationRepository.findById(regId)
                            .map(r -> r.getParticipantName()).orElse("Participant");
                } catch (Exception ignored) {}
            } else {
                if (app.getLinkedStartupId() != null) {
                    startupName = startupNames.getOrDefault(app.getLinkedStartupId(), "Unknown Startup");
                }
            }

            String founderName = "Founder";
            String founderEmail = "";
            tn.enicarthage.backend.entity.User user = app.getApplicantUserId() != null ? founders.get(app.getApplicantUserId()) : null;
            if (user != null) {
                founderName = user.getFullName() != null ? user.getFullName() : "Founder";
                founderEmail = user.getEmailAddress() != null ? user.getEmailAddress() : "";
            }

            return ApplicationResponse.builder()
                    .applicationId(app.getApplicationId())
                    .applicantUserId(app.getApplicantUserId())
                    .targetEventId(app.getTargetEventId())
                    .eventTitle(eventTitle)
                    .startupName(startupName)
                    .founderName(founderName)
                    .founderEmail(founderEmail)
                    .linkedStartupId(app.getLinkedStartupId())
                    .trackingCode(app.getTrackingCode())
                    .applicationStatus(app.getApplicationStatus())
                    .applicationSubmittedAt(app.getApplicationSubmittedAt())
                    .initialApplicationAnswers(app.getInitialApplicationAnswers())
                    .rejectionReason(app.getRejectionReason())
                    .pitchDate(app.getPitchDate())
                    .followupStatus(app.getFollowupStatus())
                    .followupQuestionsJson(app.getFollowupQuestionsJson())
                    .followupAnswersJson(app.getFollowupAnswersJson())
                    .build();
        }).collect(Collectors.toList());
        // "Show anonymised to jury": judges get startup codes instead of names
        if (anonymizer.appliesToJudgesOfEvent()) {
            responses.forEach(anonymizer::anonymize);
        }
        return ResponseEntity.ok(responses);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}/pitch-date")
    public ResponseEntity<Application> schedulePitch(@PathVariable String id, @RequestBody SchedulePitchRequest request) {
        return ResponseEntity.ok(applicationService.schedulePitch(id, request.getPitchDate()));
    }

    // PUT /api/applications/{id}/accept
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}/accept")
    public ResponseEntity<Application> acceptApplication(@PathVariable String id) {
        return ResponseEntity.ok(applicationService.acceptApplication(id));
    }

    // PUT /api/applications/{id}/reject
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}/reject")
    public ResponseEntity<Application> rejectApplication(
            @PathVariable String id,
            @RequestBody(required = false) RejectRequest body) {
        String reason = body != null ? body.reason() : null;
        return ResponseEntity.ok(applicationService.rejectApplication(id, reason));
    }

    record RejectRequest(String reason) {
    }

    // GET /api/applications/{id}
    @GetMapping("/{id}")
    public ResponseEntity<Application> getApplicationById(@PathVariable String id) {
        String userId = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication().getName();
        Application app = applicationService.getViewableApplication(id, userId, isAdmin());
        return ResponseEntity.ok(anonymizer.appliesTo(app) ? anonymizer.anonymizedCopy(app) : app);
    }

    private boolean isTeammate(Application app, String userId) {
        if (app.getLinkedStartupId() == null) return false;
        return userRepository.findById(userId).map(user -> {
            String email = user.getEmailAddress();
            return teammateInvitationRepository.findByStartupIdAndInviteeEmail(app.getLinkedStartupId(), email)
                .map(inv -> inv.getStatus() == tn.enicarthage.backend.entity.TeammateInvitation.InvitationStatus.ACCEPTED)
                .orElse(false);
        }).orElse(false);
    }

    private boolean isAdmin() {
        return org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication().getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }

    // GET /api/applications/my
    @GetMapping("/my")
    public ResponseEntity<List<ApplicationResponse>> getMyApplications() {
        String userId = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication()
                .getName();
        
        // 1. Get apps where user is the direct applicant
        List<Application> apps = applicationRepository.findByApplicantUserId(userId);
        
        // 2. Get apps for startups where user is an accepted teammate
        userRepository.findById(userId).ifPresent(user -> {
            String email = user.getEmailAddress();
            List<String> joinedStartupIds = teammateInvitationRepository
                .findByInviteeEmailAndStatus(email, tn.enicarthage.backend.entity.TeammateInvitation.InvitationStatus.ACCEPTED)
                .stream()
                .map(tn.enicarthage.backend.entity.TeammateInvitation::getStartupId)
                .collect(Collectors.toList());
            
            if (!joinedStartupIds.isEmpty()) {
                List<Application> joinedApps = applicationRepository.findByLinkedStartupIdIn(joinedStartupIds);
                // Merge lists and remove duplicates by ID
                java.util.Set<String> appIds = apps.stream().map(Application::getApplicationId).collect(java.util.stream.Collectors.toSet());
                for (Application a : joinedApps) {
                    if (!appIds.contains(a.getApplicationId())) {
                        apps.add(a);
                    }
                }
            }
        });

        // 3. Final safety filter: Only keep the most recent application per (Event, Startup) pair
        // to handle existing duplicates in the database.
        java.util.Map<String, Application> uniqueApps = new java.util.LinkedHashMap<>();
        for (Application a : apps) {
            String key = a.getTargetEventId() + "-" + a.getLinkedStartupId();
            // If we have multiple, keep the one that is already ACCEPTED or the one with the newest date
            if (!uniqueApps.containsKey(key)) {
                uniqueApps.put(key, a);
            } else {
                Application existing = uniqueApps.get(key);
                boolean existingIsAccepted = "ACCEPTED".equals(existing.getApplicationStatus());
                boolean currentIsAccepted = "ACCEPTED".equals(a.getApplicationStatus());
                
                if (currentIsAccepted && !existingIsAccepted) {
                    uniqueApps.put(key, a);
                } else if (currentIsAccepted == existingIsAccepted) {
                    // Both have same importance, keep the newer one if possible (fallback to existing)
                    if (a.getApplicationSubmittedAt() != null && existing.getApplicationSubmittedAt() != null) {
                        if (a.getApplicationSubmittedAt().after(existing.getApplicationSubmittedAt())) {
                            uniqueApps.put(key, a);
                        }
                    }
                }
            }
        }
        
        List<Application> finalApps = new java.util.ArrayList<>(uniqueApps.values());

        List<ApplicationResponse> responses = finalApps.stream().map(app -> {
            String eventTitle = "Unknown Event";
            try {
                String eventId = app.getTargetEventId();
                eventTitle = eventRepository.findById(eventId)
                        .map(e -> e.getTitle())
                        .orElse("Unknown Event");
            } catch (Exception e) {
            }
            var startup = app.getLinkedStartupId() == null ? java.util.Optional.<tn.enicarthage.backend.entity.Startup>empty()
                    : startupRepository.findById(app.getLinkedStartupId());
            String startupName = startup.map(s -> s.getProjectName()).orElse("Unknown Startup");

            return ApplicationResponse.builder()
                    .businessSector(startup.map(s -> s.getBusinessSector()).orElse(null))
                    .applicationId(app.getApplicationId())
                    .applicantUserId(app.getApplicantUserId())
                    .targetEventId(app.getTargetEventId())
                    .eventTitle(eventTitle)
                    .startupName(startupName)
                    .linkedStartupId(app.getLinkedStartupId())
                    .trackingCode(app.getTrackingCode())
                    .applicationStatus(app.getApplicationStatus())
                    .applicationSubmittedAt(app.getApplicationSubmittedAt())
                    .initialApplicationAnswers(app.getInitialApplicationAnswers())
                    .rejectionReason(app.getRejectionReason())
                    .followupStatus(app.getFollowupStatus())
                    .followupQuestionsJson(app.getFollowupQuestionsJson())
                    .followupAnswersJson(app.getFollowupAnswersJson())
                    .build();
        }).collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }

    // ── Follow-up workflow ─────────────────────────────────────────

    // PUT /api/applications/{id}/followup-questions  (Admin only)
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}/followup-questions")
    public ResponseEntity<Application> setFollowupQuestions(@PathVariable String id, @RequestBody FollowupQuestionsRequest body) {
        Application app = applicationRepository.findById(id)
                .orElseThrow(() -> new tn.enicarthage.backend.exception.ResourceNotFoundException("Application not found: " + id));

        if (isBlankJson(body.questionsJson())) {
            throw new IllegalArgumentException("Please write at least one question");
        }
        app.setFollowupStatus("waiting_answers");
        app.setFollowupQuestionsJson(body.questionsJson());
        app.setFollowupAnswersJson(null);
        Application saved = applicationRepository.save(app);

        // Notify founder
        try {
            if (saved.getApplicantUserId() != null) {
                tn.enicarthage.backend.entity.Event event = eventRepository.findById(saved.getTargetEventId()).orElse(null);
                String eventTitle = event != null ? event.getTitle() : "your event";
                notificationService.createNotification(
                        saved.getApplicantUserId(),
                        "Follow-up questions received",
                        "The admin team requested additional information for " + eventTitle + ". Open your application to answer.",
                        "FOLLOWUP",
                        saved.getTargetEventId() != null ? "/dashboard?tab=applications" : null
                );
            }
        } catch (Exception ignored) {}

        return ResponseEntity.ok(saved);
    }

    // PUT /api/applications/{id}/followup-answers (Owner/teammate can submit)
    @PutMapping("/{id}/followup-answers")
    public ResponseEntity<Application> submitFollowupAnswers(@PathVariable String id, @RequestBody FollowupAnswersRequest body) {
        String userId = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication().getName();

        Application app = applicationRepository.findById(id)
                .orElseThrow(() -> new tn.enicarthage.backend.exception.ResourceNotFoundException("Application not found: " + id));

        boolean authorized = app.getApplicantUserId() != null && app.getApplicantUserId().equals(userId);
        if (!authorized) {
            authorized = isTeammate(app, userId) || isAdmin();
        }
        if (!authorized) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        if (!"waiting_answers".equals(app.getFollowupStatus())) {
            throw new IllegalStateException("There are no follow-up questions waiting for an answer");
        }
        if (isBlankJson(body.answersJson())) {
            throw new IllegalArgumentException("Please answer the questions");
        }
        app.setFollowupStatus("answers_received");
        app.setFollowupAnswersJson(body.answersJson());
        Application saved = applicationRepository.save(app);
        return ResponseEntity.ok(saved);
    }

    record FollowupQuestionsRequest(String questionsJson) {}
    record FollowupAnswersRequest(String answersJson) {}

    @GetMapping("/{applicationId}/teammates")
    public ResponseEntity<List<Map<String, Object>>> getTeammates(@PathVariable String applicationId) {
        String userId = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication().getName();
        Application app = applicationService.getViewableApplication(applicationId, userId, isAdmin());
        if (anonymizer.appliesTo(app)) {
            return ResponseEntity.ok(List.of()); // anonymous jury: no teammate names
        }

        try {
            Map<String, Object> answers = objectMapper.readValue(app.getInitialApplicationAnswers(), Map.class);
            List<Map<String, Object>> teammates = (List<Map<String, Object>>) answers.get("teammates");
            return ResponseEntity.ok(teammates != null ? teammates : List.of());
        } catch (Exception e) {
            return ResponseEntity.ok(List.of());
        }
    }

    @GetMapping("/{applicationId}/ratings")
    public ResponseEntity<List<tn.enicarthage.backend.entity.PitchEvaluation>> getRatings(
            @PathVariable String applicationId) {
        String userId = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication().getName();
        applicationService.getViewableApplication(applicationId, userId, isAdmin());
        return ResponseEntity.ok(pitchEvaluationRepository.findByApplicationId(applicationId).map(java.util.List::of)
                .orElse(java.util.List.of()));
    }

    /** null, "", "[]", "{}" or a list of blank strings */
    private static boolean isBlankJson(String json) {
        if (json == null || json.isBlank()) return true;
        String compact = json.replaceAll("[\\s\\[\\]{}\",]", "");
        return compact.isEmpty();
    }
}

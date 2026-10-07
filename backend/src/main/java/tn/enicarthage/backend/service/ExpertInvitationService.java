package tn.enicarthage.backend.service;

import tn.enicarthage.backend.entity.InvitationLog;
import tn.enicarthage.backend.repository.InvitationLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@lombok.extern.slf4j.Slf4j
public class ExpertInvitationService {

    private final EmailService emailService;
    private final InvitationLogRepository invitationLogRepository;
    private final tn.enicarthage.backend.repository.UserRepository userRepository;
    private final tn.enicarthage.backend.repository.EventRepository eventRepository;
    private final NotificationService notificationService;

    @Value("${app.registration-base-url:http://localhost:5173}")
    private String registrationBaseUrl;

    @org.springframework.transaction.annotation.Transactional
    public void inviteExpert(String email, String expertRole, String eventId) {
        inviteExpert(email, expertRole, eventId, null);
    }

    /** Role stored on participant invitations (no expert role is granted at registration). */
    public static final String PARTICIPANT = "PARTICIPANT";

    /**
     * Invites someone to create a participant account (founder / team member). The one-time link also
     * works when public registrations are closed.
     */
    @org.springframework.transaction.annotation.Transactional
    public void inviteParticipant(String email, String personalMessage) {
        String trimmedEmail = email.trim().toLowerCase();
        if (userRepository.findByEmailAddress(trimmedEmail).isPresent()) {
            throw new IllegalStateException("This person already has a Q-AI Hub account");
        }
        String invitationId = UUID.randomUUID().toString();
        invitationLogRepository.save(InvitationLog.builder()
                .invitationId(invitationId)
                .email(trimmedEmail)
                .expertRole(PARTICIPANT)
                .invitedAt(new Date())
                .build());
        emailService.sendParticipantInvitation(trimmedEmail, buildRegistrationLink(invitationId, trimmedEmail), personalMessage);
        log.info("Participant invitation sent to {}", trimmedEmail);
    }

    @org.springframework.transaction.annotation.Transactional
    public void inviteExpert(String email, String expertRole, String eventId, String personalMessage) {
        if (eventId == null || eventId.isBlank()) {
            throw new IllegalArgumentException("Choose the event the expert will review");
        }
        String trimmedEmail = email.trim();
        String trimmedRole = expertRole.trim();
        String invitationId = UUID.randomUUID().toString();

        InvitationLog invitation = InvitationLog.builder()
                .invitationId(invitationId)
                .email(trimmedEmail)
                .expertRole(trimmedRole)
                .eventId(eventId)
                .invitedAt(new Date())
                .build();
        invitationLogRepository.save(invitation);

        // Add to event experts list immediately (for Admin view and Expert Roles view)
        tn.enicarthage.backend.entity.Event assignedEvent = null;
        if (eventId != null) {
            tn.enicarthage.backend.entity.Event event = eventRepository.findById(eventId)
                    .orElseThrow(() -> new tn.enicarthage.backend.exception.ResourceNotFoundException("Event not found: " + eventId));
            if (event.getExpertInvitations() == null) {
                event.setExpertInvitations(new java.util.ArrayList<>());
            }
            boolean alreadyInvited = event.getExpertInvitations().stream()
                    .anyMatch(ei -> ei.getEmail().equalsIgnoreCase(trimmedEmail));
            if (!alreadyInvited) {
                event.getExpertInvitations().add(new tn.enicarthage.backend.entity.Event.ExpertInvite(
                        trimmedEmail, trimmedRole, java.time.LocalDateTime.now()));
                eventRepository.save(event);
                assignedEvent = event;
                log.info("Linked expert {} to event {}", trimmedEmail, eventId);
            }
        }

        // Experts who already have an account: give them the expert role (their next login carries it)
        // and notify them once the assignment is persisted. New accounts are notified at registration.
        final tn.enicarthage.backend.entity.Event notifiedEvent = assignedEvent;
        userRepository.findByEmailAddress(trimmedEmail).ifPresent(user -> {
            if (user.getExpertRole() == null) {
                try {
                    user.setExpertRole(tn.enicarthage.backend.entity.User.ExpertRole.fromLabel(trimmedRole));
                    userRepository.save(user);
                } catch (IllegalArgumentException e) {
                    log.warn("Unknown expert role '{}' for {}", trimmedRole, trimmedEmail);
                }
            }
            if (notifiedEvent != null) {
                notificationService.createNotification(
                        user.getUserId(),
                        "Expert Role Assigned",
                        "You have been assigned as " + trimmedRole + " to review applications for "
                                + notifiedEvent.getTitle() + ".",
                        "ROLE_UPDATE",
                        "/expert/event/" + notifiedEvent.getEventId()
                );
            }
        });

        // Existing account: log in and land on the event's judge page. New expert: create the account first.
        boolean hasAccount = userRepository.findByEmailAddress(trimmedEmail).isPresent();
        String registrationLink = hasAccount
                ? buildLoginLink(eventId)
                : buildRegistrationLink(invitationId, trimmedEmail);

        // Resolve event title for the email body (best-effort; falls back to a generic phrase).
        String eventTitle = null;
        if (eventId != null) {
            eventTitle = eventRepository.findById(eventId)
                    .map(tn.enicarthage.backend.entity.Event::getTitle)
                    .orElse(null);
        }

        try {
            emailService.sendExpertInvitation(trimmedEmail, trimmedRole, eventTitle, registrationLink, personalMessage);
            log.info("Expert invitation email queued for {} as {}", trimmedEmail, trimmedRole);
        } catch (Exception e) {
            log.error("Failed to send invitation email to {}: {}", trimmedEmail, e.getMessage());
        }
    }

    String buildLoginLink(String eventId) {
        String base = registrationBaseUrl.endsWith("/")
                ? registrationBaseUrl.substring(0, registrationBaseUrl.length() - 1)
                : registrationBaseUrl;
        String target = eventId != null ? "/expert/event/" + eventId : "/dashboard?tab=expert";
        return base + "/login?redirect=" + URLEncoder.encode(target, StandardCharsets.UTF_8);
    }

    String buildRegistrationLink(String invitationId, String email) {
        String base = registrationBaseUrl.endsWith("/")
                ? registrationBaseUrl.substring(0, registrationBaseUrl.length() - 1)
                : registrationBaseUrl;
        String encInvite = URLEncoder.encode(invitationId, StandardCharsets.UTF_8);
        String encEmail = URLEncoder.encode(email, StandardCharsets.UTF_8);
        return base + "/register?invite=" + encInvite + "&email=" + encEmail;
    }
}

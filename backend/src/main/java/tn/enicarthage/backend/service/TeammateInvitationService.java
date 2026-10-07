package tn.enicarthage.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.enicarthage.backend.entity.TeammateInvitation;
import tn.enicarthage.backend.entity.User;
import tn.enicarthage.backend.exception.ResourceNotFoundException;
import tn.enicarthage.backend.repository.StartupRepository;
import tn.enicarthage.backend.repository.TeammateInvitationRepository;
import tn.enicarthage.backend.repository.UserRepository;

import java.util.Date;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class TeammateInvitationService {

    private final TeammateInvitationRepository invitationRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final EmailService emailService;
    private final StartupRepository startupRepository;
    private final tn.enicarthage.backend.repository.ApplicationRepository applicationRepository;

    // A refused invitation (validation) must not roll back the caller's transaction,
    // e.g. an application submitted with a teammate who was already invited.
    @Transactional(noRollbackFor = {IllegalArgumentException.class, IllegalStateException.class,
            AccessDeniedException.class, ResourceNotFoundException.class})
    public TeammateInvitation invite(String startupId, String applicationId,
                                     String inviterUserId, String inviteeEmail, String role, String personalMessage) {

        if (inviteeEmail == null || !inviteeEmail.trim().matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) {
            throw new IllegalArgumentException("Please enter a valid email address");
        }
        String normalizedEmail = inviteeEmail.trim().toLowerCase();

        // Only the startup's founder can invite people into it
        var startup = startupRepository.findById(startupId == null ? "" : startupId)
                .orElseThrow(() -> new ResourceNotFoundException("Startup not found"));
        if (!inviterUserId.equals(startup.getFounderUserId())) {
            throw new AccessDeniedException("Only the founder of this startup can invite teammates");
        }
        // The application, if given, must be this startup's
        if (applicationId != null && !applicationId.isBlank()) {
            boolean sameStartup = applicationRepository.findById(applicationId)
                    .map(a -> startupId.equals(a.getLinkedStartupId())).orElse(false);
            if (!sameStartup) {
                throw new AccessDeniedException("This application does not belong to this startup");
            }
        }
        String founderEmail = userRepository.findById(inviterUserId).map(User::getEmailAddress).orElse("");
        if (normalizedEmail.equalsIgnoreCase(founderEmail)) {
            throw new IllegalArgumentException("You are already the founder of this startup");
        }
        var existing = invitationRepository.findByStartupIdAndInviteeEmail(startupId, normalizedEmail);
        if (existing.isPresent() && existing.get().getStatus() != TeammateInvitation.InvitationStatus.DECLINED) {
            throw new IllegalStateException(existing.get().getStatus() == TeammateInvitation.InvitationStatus.ACCEPTED
                    ? "This person is already in your team"
                    : "This person has already been invited");
        }
        existing.ifPresent(invitationRepository::delete); // a declined invitation can be sent again

        // Persist the invite
        TeammateInvitation inv = TeammateInvitation.builder()
                .startupId(startupId)
                .applicationId(applicationId)
                .inviterUserId(inviterUserId)
                .inviteeEmail(normalizedEmail)
                .inviteeRole(role)
                .personalMessage(personalMessage)
                .build();
        invitationRepository.save(inv);

        String startupName = startupRepository.findById(startupId)
                .map(s -> s.getProjectName()).orElse("a startup");

        // In-app notification if user already registered
        userRepository.findByEmailAddress(normalizedEmail).ifPresent(user -> {
            notificationService.createNotification(
                user.getUserId(),
                "Startup Team Invitation",
                "You've been invited to join " + startupName + " as " + role
                    + ". Message: " + (personalMessage != null ? personalMessage : "No message provided."),
                "TEAM_INVITE"
            );
        });

        // Email notification (works even if not yet registered)
        // Uses the unified wrap() template — same branding as all other Q-AI Hub emails.
        emailService.sendTeammateInvitation(normalizedEmail, startupName, role, personalMessage);

        log.info("Team invitation sent: {} invited {} to startup {}", inviterUserId, normalizedEmail, startupId);
        return inv;
    }

    @Transactional
    public TeammateInvitation respond(String invitationId, String userId, boolean accept) {
        TeammateInvitation inv = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new ResourceNotFoundException("Invitation not found"));

        // Verify the responding user owns this email
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (!user.getEmailAddress().equalsIgnoreCase(inv.getInviteeEmail())) {
            throw new AccessDeniedException("This invitation is not for your account");
        }
        if (inv.getStatus() != TeammateInvitation.InvitationStatus.PENDING) {
            throw new IllegalStateException("You have already answered this invitation");
        }

        inv.setStatus(accept
                ? TeammateInvitation.InvitationStatus.ACCEPTED
                : TeammateInvitation.InvitationStatus.DECLINED);
        inv.setRespondedAt(new Date());
        invitationRepository.save(inv);

        // Notify the founder
        String startupName = startupRepository.findById(inv.getStartupId())
                .map(s -> s.getProjectName()).orElse("your startup");
        notificationService.createNotification(
            inv.getInviterUserId(),
            accept ? "Teammate Joined!" : "Invitation Declined",
            user.getFullName() + (accept
                ? " accepted your invitation to join " + startupName + "."
                : " declined your invitation to join " + startupName + "."),
            accept ? "TEAM_JOINED" : "TEAM_DECLINED"
        );

        log.info("Team invitation {} {} by user {}", invitationId, accept ? "ACCEPTED" : "DECLINED", userId);
        return inv;
    }

    public List<TeammateInvitation> getMyInvitations(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return invitationRepository.findByInviteeEmail(user.getEmailAddress());
    }

    public List<TeammateInvitation> getInvitationsByStartup(String startupId) {
        return invitationRepository.findByStartupId(startupId);
    }

    public List<TeammateInvitation> getAcceptedTeammates(String startupId) {
        return invitationRepository.findByStartupIdAndStatus(startupId, TeammateInvitation.InvitationStatus.ACCEPTED);
    }

    @Transactional
    public void removeTeammate(String invitationId, String requesterUserId) {
        TeammateInvitation inv = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new ResourceNotFoundException("Invitation not found"));

        // Only founder or the teammate themselves can remove/leave
        User requester = userRepository.findById(requesterUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        boolean isFounder = inv.getInviterUserId().equals(requesterUserId);
        boolean isTeammate = requester.getEmailAddress().equalsIgnoreCase(inv.getInviteeEmail());

        if (!isFounder && !isTeammate) {
            throw new AccessDeniedException("Not authorized to remove this teammate");
        }

        invitationRepository.delete(inv);
        log.info("Teammate invitation {} removed by {}", invitationId, requesterUserId);
    }
}

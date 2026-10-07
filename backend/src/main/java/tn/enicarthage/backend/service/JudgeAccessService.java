package tn.enicarthage.backend.service;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import tn.enicarthage.backend.entity.Event;
import tn.enicarthage.backend.entity.Phase;
import tn.enicarthage.backend.entity.PitchRound;
import tn.enicarthage.backend.repository.EventRepository;
import tn.enicarthage.backend.repository.PhaseRepository;
import tn.enicarthage.backend.repository.PhaseSubmissionRepository;

/**
 * Who may judge pitches: an admin, or an expert invited to that specific event.
 * Access is checked per event from the event's expert invitations, so it works
 * right after the admin invites someone (no global role / re-login needed).
 */
@Service
@RequiredArgsConstructor
public class JudgeAccessService {

    private final ApplicationService applicationService;
    private final EventRepository eventRepository;
    private final PhaseRepository phaseRepository;
    private final PhaseSubmissionRepository phaseSubmissionRepository;
    private final tn.enicarthage.backend.repository.StartupRepository startupRepository;
    private final tn.enicarthage.backend.repository.ApplicationRepository applicationRepository;
    private final tn.enicarthage.backend.repository.TeammateInvitationRepository teammateInvitationRepository;
    private final tn.enicarthage.backend.repository.PlatformSettingRepository platformSettingRepository;

    public boolean isAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }

    /** Email of the logged-in user or admin (the auth name is their id). */
    public String currentEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()
                || auth instanceof org.springframework.security.authentication.AnonymousAuthenticationToken) {
            return null;
        }
        return applicationService.resolveRequesterEmail(auth.getName());
    }

    public boolean canJudgeEvent(String eventId) {
        if (isAdmin()) return true;
        if (eventId == null) return false;
        String email = currentEmail();
        return eventRepository.findById(eventId)
                .map(event -> applicationService.isInvitedExpert(event, email))
                .orElse(false);
    }

    public void assertCanJudgeEvent(String eventId) {
        if (!canJudgeEvent(eventId)) {
            throw new AccessDeniedException("You are not assigned to this event as a judge");
        }
    }

    public void assertCanJudgePhase(String phaseId) {
        Phase phase = phaseRepository.findById(phaseId)
                .orElseThrow(() -> new EntityNotFoundException("Phase not found: " + phaseId));
        assertCanJudgeEvent(phase.getEventId());
    }

    public boolean canJudgeSubmission(Long submissionId) {
        if (isAdmin()) return true;
        return phaseSubmissionRepository.findById(submissionId)
                .map(sub -> sub.getPhase() != null && canJudgeEvent(sub.getPhase().getEventId()))
                .orElse(false);
    }

    public void assertCanJudgeSubmission(Long submissionId) {
        if (!canJudgeSubmission(submissionId)) {
            throw new AccessDeniedException("You are not assigned to this event as a judge");
        }
    }

    public void assertCanJudgeRound(PitchRound round) {
        assertCanJudgeEvent(round.getPhase().getEventId());
    }

    /**
     * Who may read a startup profile: an admin, its founder, an accepted teammate,
     * or a judge of an event the startup applied to.
     */
    public boolean canViewStartup(String startupId) {
        if (isAdmin()) return true;
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        var startup = startupRepository.findById(startupId).orElse(null);
        if (startup == null) return false;
        if (auth.getName().equals(startup.getFounderUserId())) return true;
        String email = currentEmail();
        boolean teammate = email != null && teammateInvitationRepository
                .findByStartupIdAndInviteeEmail(startupId, email)
                .map(inv -> inv.getStatus() == tn.enicarthage.backend.entity.TeammateInvitation.InvitationStatus.ACCEPTED)
                .orElse(false);
        if (teammate) return true;
        boolean anonymousJury = platformSettingRepository.findAll().stream().findFirst()
                .map(tn.enicarthage.backend.entity.PlatformSetting::getShowAnonymousToJury)
                .orElse(false) == Boolean.TRUE;
        if (anonymousJury) {
            return false; // anonymous jury: the startup profile would reveal the names
        }
        return applicationRepository.findByLinkedStartupId(startupId).stream()
                .anyMatch(app -> canJudgeEvent(app.getTargetEventId()));
    }

    public void assertCanViewStartup(String startupId) {
        if (!canViewStartup(startupId)) {
            throw new AccessDeniedException("You are not allowed to view this startup");
        }
    }

    /** True for admins and for anyone invited as an expert to at least one event. */
    public boolean isAdminOrExpert() {
        if (isAdmin()) return true;
        String email = currentEmail();
        return email != null && !eventRepository.findByExpertEmail(email).isEmpty();
    }

    public Event getEvent(String eventId) {
        return eventRepository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Event not found: " + eventId));
    }
}

package tn.enicarthage.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.enicarthage.backend.entity.Application;
import tn.enicarthage.backend.entity.Startup;
import tn.enicarthage.backend.entity.User;
import tn.enicarthage.backend.exception.ResourceNotFoundException;
import tn.enicarthage.backend.repository.*;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * "Delete my account": removes the user and everything that belongs to them, in one transaction,
 * so nothing is left behind (no orphan startups/applications, no session that can still be renewed).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AccountDeletionService {

    private final UserRepository userRepository;
    private final StartupRepository startupRepository;
    private final ApplicationRepository applicationRepository;
    private final PhaseSubmissionRepository submissionRepository;
    private final PitchRoundResultRepository roundResultRepository;
    private final PitchEvaluationRepository pitchEvaluationRepository;
    private final PitchRepository pitchRepository;
    private final TeammateInvitationRepository invitationRepository;
    private final EventRegistrationRepository registrationRepository;
    private final EventSubscriptionRepository subscriptionRepository;
    private final NotificationRepository notificationRepository;
    private final OtpTokenRepository otpTokenRepository;
    private final RefreshTokenService refreshTokenService;
    private final EventRegistrationService registrationService;

    @Transactional
    public void deleteAccount(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        String email = user.getEmailAddress();

        // 1. sessions: nothing can be renewed any more
        refreshTokenService.revokeAllUserTokens(userId);
        otpTokenRepository.deleteByUserId(userId);

        // 2. startups they founded, with everything attached to them
        List<Startup> startups = startupRepository.findAll().stream()
                .filter(s -> userId.equals(s.getFounderUserId())).toList();
        Set<Application> applications = new LinkedHashSet<>(applicationRepository.findByApplicantUserId(userId));
        for (Startup s : startups) {
            applications.addAll(applicationRepository.findByLinkedStartupId(s.getStartupId()));
            invitationRepository.deleteAll(invitationRepository.findByStartupId(s.getStartupId()));
            pitchRepository.deleteAll(pitchRepository.findByPresentingStartupId(s.getStartupId()));
        }

        // 3. their applications, with submissions and jury scores
        for (Application a : applications) {
            submissionRepository.deleteAll(submissionRepository.findBySourceApplicationId(a.getApplicationId()));
            roundResultRepository.deleteAll(roundResultRepository.findByApplicationId(a.getApplicationId()));
            pitchEvaluationRepository.findByApplicationId(a.getApplicationId()).ifPresent(pitchEvaluationRepository::delete);
            invitationRepository.deleteAll(invitationRepository.findAll().stream()
                    .filter(i -> a.getApplicationId().equals(i.getApplicationId())).toList());
        }
        applicationRepository.deleteAll(applications);
        startupRepository.deleteAll(startups);

        // 4. what is linked to their email or id elsewhere
        invitationRepository.deleteAll(invitationRepository.findByInviteeEmail(email.toLowerCase()));
        registrationRepository.findAll().stream()
                .filter(r -> email.equalsIgnoreCase(r.getParticipantEmail()))
                .forEach(r -> registrationService.deleteRegistration(r.getId())); // also frees the seat
        subscriptionRepository.deleteAll(subscriptionRepository.findAll().stream()
                .filter(s -> email.equalsIgnoreCase(s.getEmail()) || userId.equals(s.getUserId())).toList());
        notificationRepository.deleteAll(notificationRepository.findByTargetUserIdOrderByNotificationCreatedAtDesc(userId));

        // 5. the account itself (skills / availability go with it)
        userRepository.delete(user);
        log.info("Account {} deleted with {} startup(s) and {} application(s)", userId, startups.size(), applications.size());
    }
}

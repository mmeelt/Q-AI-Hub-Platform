package tn.enicarthage.backend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tn.enicarthage.backend.entity.Phase;
import tn.enicarthage.backend.entity.PhaseSubmission;
import tn.enicarthage.backend.repository.*;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PhaseSubmissionServiceTest {

    @Mock private PhaseSubmissionRepository submissionRepository;
    @Mock private PhaseRepository phaseRepository;
    @Mock private NotificationService notificationService;
    @Mock private ApplicationRepository applicationRepository;
    @Mock private UserRepository userRepository;
    @Mock private StartupRepository startupRepository;
    @Mock private EmailService emailService;
    @Mock private TeammateInvitationRepository teammateInvitationRepository;

    @InjectMocks
    private PhaseSubmissionService service;

    private PhaseSubmission submission;

    @BeforeEach
    void setUp() {
        Phase phase2 = Phase.builder().phaseId("p2").eventId("e1").phaseOrder(2).build();
        submission = PhaseSubmission.builder().id(1L).phase(phase2).sourceApplicationId("a1")
                .status(PhaseSubmission.SubmissionStatus.SUBMITTED).submittedAt(LocalDateTime.now()).build();
        lenient().when(submissionRepository.findById(1L)).thenReturn(Optional.of(submission));
        lenient().when(submissionRepository.save(any())).thenAnswer(a -> a.getArgument(0));
    }

    @Test
    void grade_isSentOnce_aSecondGradeIsRefused_andTheFirstOneIsKept() {
        service.gradeSubmission(1L, 72.0, "Solid prototype");

        assertThrows(IllegalStateException.class, () -> service.gradeSubmission(1L, 95.0, "Changed my mind"));
        assertEquals(72.0, submission.getEvaluationScore());
        assertEquals("Solid prototype", submission.getEvaluatorFeedback());
        verify(submissionRepository, times(1)).save(any());
    }

    @Test
    void grade_afterTheDecision_orOnADraft_isRefused() {
        submission.setDecisionStatus(PhaseSubmission.DecisionStatus.REJECTED);
        assertThrows(IllegalStateException.class, () -> service.gradeSubmission(1L, 80.0, "Late grade"));

        submission.setDecisionStatus(PhaseSubmission.DecisionStatus.PENDING);
        submission.setStatus(PhaseSubmission.SubmissionStatus.DRAFT);
        assertThrows(IllegalStateException.class, () -> service.gradeSubmission(1L, 80.0, "Nothing to grade"));
        verify(submissionRepository, never()).save(any());
    }

    @Test
    void decision_keepsTheFeedbackAlreadySentWithTheGrade() {
        service.gradeSubmission(1L, 72.0, "Solid prototype");

        service.decideSubmission(1L, PhaseSubmission.DecisionStatus.ACCEPTED, "Another text");

        assertEquals("Solid prototype", submission.getEvaluatorFeedback());
        assertEquals(PhaseSubmission.DecisionStatus.ACCEPTED, submission.getDecisionStatus());
        assertThrows(IllegalStateException.class,
                () -> service.decideSubmission(1L, PhaseSubmission.DecisionStatus.REJECTED, "Reversed"));
    }
}

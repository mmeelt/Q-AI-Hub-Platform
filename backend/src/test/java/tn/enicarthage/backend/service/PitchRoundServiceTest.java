package tn.enicarthage.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import tn.enicarthage.backend.entity.Application;
import tn.enicarthage.backend.entity.Phase;
import tn.enicarthage.backend.entity.PitchRound;
import tn.enicarthage.backend.entity.PitchRoundResult;
import tn.enicarthage.backend.repository.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PitchRoundServiceTest {

    @Mock private PitchRoundRepository pitchRoundRepository;
    @Mock private PitchRoundResultRepository resultRepository;
    @Mock private PhaseRepository phaseRepository;
    @Mock private PhaseSubmissionRepository phaseSubmissionRepository;
    @Mock private PitchEvaluationRepository pitchEvaluationRepository;
    @Mock private ApplicationRepository applicationRepository;
    @Mock private StartupRepository startupRepository;
    @Mock private UserRepository userRepository;
    @Mock private EmailService emailService;
    @Mock private GeminiService geminiService;
    @Mock private NotificationService notificationService;
    @Spy private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private PitchRoundService service;

    private PitchRound round;
    private Application app;

    @BeforeEach
    void setUp() {
        Phase phase = Phase.builder().phaseId("phase-3").eventId("event-1").phaseOrder(3).build();
        // 5 criteria x 5 points = 25 max, passes at 15
        round = PitchRound.builder().id(1L).phase(phase).roundNumber(1).roundName("Ideation Round")
                .criteriaJson("[{\"criterion\":\"A\",\"maxPoints\":5},{\"criterion\":\"B\",\"maxPoints\":5},"
                        + "{\"criterion\":\"C\",\"maxPoints\":5},{\"criterion\":\"D\",\"maxPoints\":5},"
                        + "{\"criterion\":\"E\",\"maxPoints\":5}]")
                .build();
        app = Application.builder().applicationId("app-1").targetEventId("event-1").applicantUserId("founder-1").build();
        lenient().when(pitchRoundRepository.findById(1L)).thenReturn(Optional.of(round));
        lenient().when(applicationRepository.findById("app-1")).thenReturn(Optional.of(app));
    }

    private PitchRoundResult result(long id, String judge, double total, PitchRoundResult.RoundDecision d) {
        return PitchRoundResult.builder().id(id).pitchRound(round).applicationId("app-1")
                .evaluatedBy(judge).totalScore(total).decision(d).feedback("feedback " + judge).build();
    }

    @Test
    void evaluate_createsOneResultPerJudge_andSendsNothingToTheStartup() {
        when(resultRepository.findByPitchRoundIdAndApplicationIdAndEvaluatedByIgnoreCase(1L, "app-1", "judge@x.com"))
                .thenReturn(Optional.empty());

        PitchRoundResult saved = service.evaluateParticipant(1L, "app-1",
                "{\"A\":4,\"B\":4,\"C\":3,\"D\":5,\"E\":4}", PitchRoundResult.RoundDecision.PASSED,
                "Good", "judge@x.com", null);

        assertEquals(20.0, saved.getTotalScore());
        assertEquals("judge@x.com", saved.getEvaluatedBy());
        verify(resultRepository).save(saved);
        // Results are only emailed when the admin sends them
        verifyNoInteractions(emailService, notificationService);
    }

    @Test
    void evaluate_again_updatesTheSameJudgeResult() {
        PitchRoundResult existing = result(7L, "judge@x.com", 10, PitchRoundResult.RoundDecision.REJECTED);
        when(resultRepository.findByPitchRoundIdAndApplicationIdAndEvaluatedByIgnoreCase(1L, "app-1", "judge@x.com"))
                .thenReturn(Optional.of(existing));

        PitchRoundResult saved = service.evaluateParticipant(1L, "app-1",
                "{\"A\":5,\"B\":5,\"C\":5,\"D\":5,\"E\":5}", PitchRoundResult.RoundDecision.PASSED,
                "Changed my mind", "judge@x.com", null);

        assertSame(existing, saved);
        assertEquals(25.0, saved.getTotalScore());
        assertEquals(PitchRoundResult.RoundDecision.PASSED, saved.getDecision());
    }

    @Test
    void evaluate_rejectsScoresAboveTheRoundMaximum() {
        assertThrows(IllegalArgumentException.class, () -> service.evaluateParticipant(1L, "app-1",
                "{\"A\":30}", PitchRoundResult.RoundDecision.PASSED, "", "judge@x.com", null));
    }

    @Test
    void evaluate_rejectsAStartupFromAnotherEvent() {
        app.setTargetEventId("other-event");
        assertThrows(IllegalArgumentException.class, () -> service.evaluateParticipant(1L, "app-1",
                "{\"A\":3}", PitchRoundResult.RoundDecision.PASSED, "", "judge@x.com", null));
    }

    @Test
    void summary_averagesAllJudges_andDecidesOnTheAverage() {
        // 20 + 14 + 11 = 45 / 3 = 15.0 -> exactly 60% of 25 -> PASSED, although 2 of 3 judges rejected
        when(resultRepository.findByPitchRoundId(1L)).thenReturn(List.of(
                result(1L, "a@x.com", 20, PitchRoundResult.RoundDecision.PASSED),
                result(2L, "b@x.com", 14, PitchRoundResult.RoundDecision.REJECTED),
                result(3L, "c@x.com", 11, PitchRoundResult.RoundDecision.REJECTED)));

        List<Map<String, Object>> summary = service.getRoundSummary(1L);

        assertEquals(1, summary.size());
        Map<String, Object> entry = summary.get(0);
        assertEquals(3, entry.get("judgeCount"));
        assertEquals(15.0, entry.get("averageScore"));
        assertEquals(1L, entry.get("passedVotes"));
        assertEquals(PitchRoundResult.RoundDecision.PASSED, entry.get("finalDecision"));
        assertEquals(3, ((List<?>) entry.get("evaluations")).size());
    }

    @Test
    void sendResults_emailsEachStartupOnce_withTheAverage_andMarksTheRoundAsSent() {
        when(resultRepository.findByPitchRoundId(1L)).thenReturn(List.of(
                result(1L, "a@x.com", 10, PitchRoundResult.RoundDecision.REJECTED),
                result(2L, "b@x.com", 12, PitchRoundResult.RoundDecision.REJECTED)));
        when(userRepository.findById("founder-1")).thenReturn(Optional.of(
                tn.enicarthage.backend.entity.User.builder().userId("founder-1").emailAddress("founder@x.com").build()));

        Map<String, Object> res = service.sendBulkResults(1L);

        assertEquals(1, res.get("emailsSent"));
        verify(emailService, times(1)).sendPitchRoundResult(eq("founder@x.com"), anyString(), eq("Ideation Round"),
                eq(11.0), eq("REJECTED"), contains("Judge 1"), anyString());
        assertNotNull(round.getResultsSentAt());
    }

    @Test
    void passedByRound_usesTheFinalAveragedDecision() {
        when(resultRepository.findByPitchRoundId(1L)).thenReturn(List.of(
                result(1L, "a@x.com", 24, PitchRoundResult.RoundDecision.PASSED),
                result(2L, "b@x.com", 4, PitchRoundResult.RoundDecision.REJECTED)));
        // average 14 < 15 -> not passed
        assertTrue(service.getPassedByRound(1L).isEmpty());
    }
}

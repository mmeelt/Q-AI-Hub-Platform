package tn.enicarthage.backend.service;

import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tn.enicarthage.backend.entity.Application;
import tn.enicarthage.backend.entity.Event;
import tn.enicarthage.backend.entity.Phase;
import tn.enicarthage.backend.entity.PhaseSubmission;
import tn.enicarthage.backend.repository.ApplicationRepository;
import tn.enicarthage.backend.repository.EventRepository;
import tn.enicarthage.backend.repository.PhaseRepository;
import tn.enicarthage.backend.repository.PhaseSubmissionRepository;
import tn.enicarthage.backend.repository.PitchRoundRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

// TC-08 – Admin crée une phase
@ExtendWith(MockitoExtension.class)
class PhaseServiceTest {

    @Mock private PhaseRepository phaseRepository;
    @Mock private EventRepository eventRepository;
    @Mock private ApplicationRepository applicationRepository;
    @Mock private NotificationService notificationService;
    @Mock private PhaseSubmissionRepository phaseSubmissionRepository;
    @Mock private PitchRoundRepository pitchRoundRepository;

    @InjectMocks
    private PhaseService service;

    @BeforeEach
    void setUp() {
        lenient().when(eventRepository.findById("event-1"))
                .thenReturn(Optional.of(Event.builder().eventId("event-1").build()));
        lenient().when(phaseRepository.save(any())).thenAnswer(a -> a.getArgument(0));
    }

    private Phase existing(int order, boolean active, boolean locked) {
        return Phase.builder().phaseId("p" + order).eventId("event-1").phaseName("Phase " + order)
                .phaseOrder(order).phaseActive(active).phaseLocked(locked).build();
    }

    @Test
    void createPhase_appendsAfterTheLastPhase_andStartsClosed() {
        when(phaseRepository.findByEventIdOrderByPhaseOrderAsc("event-1"))
                .thenReturn(List.of(existing(1, false, true), existing(2, true, false)));

        Phase input = new Phase();
        input.setPhaseName("  Demo Day  ");
        input.setPhaseActive(true);
        input.setPhaseLocked(true);

        Phase created = service.createPhase("event-1", input);

        assertNotNull(created.getPhaseId());
        assertEquals("event-1", created.getEventId());
        assertEquals("Demo Day", created.getPhaseName());
        assertEquals(3, created.getPhaseOrder());
        assertEquals(Phase.PhaseType.QUESTIONNAIRE, created.getPhaseType());
        assertFalse(created.getPhaseActive());
        assertFalse(created.getPhaseLocked());
        verify(phaseRepository).save(created);
    }

    @Test
    void createPhase_firstPhaseOfAnEvent_getsOrderOne() {
        when(phaseRepository.findByEventIdOrderByPhaseOrderAsc("event-1")).thenReturn(List.of());

        Phase input = new Phase();
        input.setPhaseName("Pitch");
        input.setPhaseType(Phase.PhaseType.PITCH);

        Phase created = service.createPhase("event-1", input);

        assertEquals(1, created.getPhaseOrder());
        assertEquals(Phase.PhaseType.PITCH, created.getPhaseType());
    }

    @Test
    void createPhase_ignoresAnIdSentInTheBody() {
        when(phaseRepository.findByEventIdOrderByPhaseOrderAsc("event-1")).thenReturn(List.of());

        Phase input = new Phase();
        input.setPhaseId("p1");
        input.setPhaseName("Bootcamp");

        assertNotEquals("p1", service.createPhase("event-1", input).getPhaseId());
    }

    @Test
    void createPhase_withoutName_isRejected() {
        Phase input = new Phase();
        input.setPhaseName("   ");

        assertThrows(IllegalArgumentException.class, () -> service.createPhase("event-1", input));
        verify(phaseRepository, never()).save(any());
    }

    @Test
    void createPhase_endBeforeStart_isRejected() {
        Phase input = new Phase();
        input.setPhaseName("Bootcamp");
        input.setStartDate(LocalDate.of(2026, 5, 10));
        input.setEndDate(LocalDate.of(2026, 5, 1));

        assertThrows(IllegalArgumentException.class, () -> service.createPhase("event-1", input));
        verify(phaseRepository, never()).save(any());
    }

    @Test
    void createPhase_withATakenOrder_isRejected() {
        when(phaseRepository.findByEventIdOrderByPhaseOrderAsc("event-1"))
                .thenReturn(List.of(existing(1, false, false), existing(2, false, false)));

        Phase input = new Phase();
        input.setPhaseName("Bootcamp");
        input.setPhaseOrder(2);

        assertThrows(IllegalStateException.class, () -> service.createPhase("event-1", input));
        verify(phaseRepository, never()).save(any());
    }

    @Test
    void createPhase_beforeAPhaseThatAlreadyStarted_isRejected() {
        when(phaseRepository.findByEventIdOrderByPhaseOrderAsc("event-1"))
                .thenReturn(List.of(existing(2, true, false)));

        Phase input = new Phase();
        input.setPhaseName("Bootcamp");
        input.setPhaseOrder(1);

        assertThrows(IllegalStateException.class, () -> service.createPhase("event-1", input));
        verify(phaseRepository, never()).save(any());
    }

    @Test
    void createPhase_forUnknownEvent_isRejected() {
        when(eventRepository.findById("missing")).thenReturn(Optional.empty());

        Phase input = new Phase();
        input.setPhaseName("Bootcamp");

        assertThrows(EntityNotFoundException.class, () -> service.createPhase("missing", input));
    }

    @Test
    void deletePhase_closedPhaseWithoutWork_isDeleted() {
        Phase phase = existing(3, false, false);
        when(phaseRepository.findById("p3")).thenReturn(Optional.of(phase));
        when(phaseSubmissionRepository.findByPhaseId("p3")).thenReturn(List.of());
        when(pitchRoundRepository.findByPhaseIdOrderByRoundNumberAsc("p3")).thenReturn(List.of());

        service.deletePhase("p3");

        verify(phaseRepository).delete(phase);
    }

    @Test
    void deletePhase_openOrFinishedPhase_isRefused() {
        when(phaseRepository.findById("p1")).thenReturn(Optional.of(existing(1, true, false)));
        when(phaseRepository.findById("p2")).thenReturn(Optional.of(existing(2, false, true)));

        assertThrows(IllegalStateException.class, () -> service.deletePhase("p1"));
        assertThrows(IllegalStateException.class, () -> service.deletePhase("p2"));
        verify(phaseRepository, never()).delete(any());
    }

    @Test
    void deletePhase_withSubmissions_isRefused() {
        when(phaseRepository.findById("p3")).thenReturn(Optional.of(existing(3, false, false)));
        when(phaseSubmissionRepository.findByPhaseId("p3"))
                .thenReturn(List.of(new tn.enicarthage.backend.entity.PhaseSubmission()));

        assertThrows(IllegalStateException.class, () -> service.deletePhase("p3"));
        verify(phaseRepository, never()).delete(any());
    }

    private Application accepted(String id, String userId) {
        return Application.builder().applicationId(id).applicantUserId(userId).targetEventId("event-1")
                .applicationStatus("ACCEPTED").build();
    }

    @Test
    void reopenPhase_aClosedPhaseOpensAgain_laterPhasesGoBackToNotStarted_andLateParticipantsAreNotified() {
        Phase phase1 = existing(1, false, true);
        Phase phase2 = existing(2, true, false);
        when(phaseRepository.findById("p1")).thenReturn(Optional.of(phase1));
        when(phaseRepository.findByEventIdOrderByPhaseOrderAsc("event-1")).thenReturn(List.of(phase1, phase2));
        when(applicationRepository.findByTargetEventId("event-1"))
                .thenReturn(List.of(accepted("a-late", "user-late"), accepted("a-done", "user-done")));
        when(phaseSubmissionRepository.findByPhaseIdAndSourceApplicationId("p1", "a-late")).thenReturn(Optional.empty());
        when(phaseSubmissionRepository.findByPhaseIdAndSourceApplicationId("p1", "a-done")).thenReturn(Optional.of(
                PhaseSubmission.builder().status(PhaseSubmission.SubmissionStatus.SUBMITTED).build()));

        Phase reopened = service.reopenPhase("p1");

        assertTrue(reopened.getPhaseActive());
        assertFalse(reopened.getPhaseLocked());
        assertFalse(phase2.getPhaseActive());
        assertFalse(phase2.getPhaseLocked());
        verify(notificationService).createNotification(eq("user-late"), anyString(), anyString(), eq("PHASE_ACTIVATED"), anyString());
        verify(notificationService, never()).createNotification(eq("user-done"), anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void reopenPhase_anOpenOrNotStartedPhase_isRefused() {
        when(phaseRepository.findById("p1")).thenReturn(Optional.of(existing(1, true, false)));
        when(phaseRepository.findById("p2")).thenReturn(Optional.of(existing(2, false, false)));
        when(phaseRepository.findByEventIdOrderByPhaseOrderAsc("event-1")).thenReturn(List.of());

        assertThrows(IllegalStateException.class, () -> service.reopenPhase("p1"));
        assertThrows(IllegalStateException.class, () -> service.reopenPhase("p2"));
    }

    @Test
    void activationCheck_countsWhoWouldBeLeftBehindInThePhaseThatCloses() {
        Phase phase1 = existing(1, true, false);
        Phase phase2 = existing(2, false, false);
        when(phaseRepository.findById("p2")).thenReturn(Optional.of(phase2));
        when(phaseRepository.findByEventIdOrderByPhaseOrderAsc("event-1")).thenReturn(List.of(phase1, phase2));
        when(applicationRepository.findByTargetEventId("event-1")).thenReturn(List.of(
                accepted("a-late", "u1"), accepted("a-waiting", "u2"), accepted("a-decided", "u3")));
        when(phaseSubmissionRepository.findByPhaseIdAndSourceApplicationId("p1", "a-late")).thenReturn(Optional.empty());
        when(phaseSubmissionRepository.findByPhaseIdAndSourceApplicationId("p1", "a-waiting")).thenReturn(Optional.of(
                PhaseSubmission.builder().status(PhaseSubmission.SubmissionStatus.SUBMITTED).build()));
        when(phaseSubmissionRepository.findByPhaseIdAndSourceApplicationId("p1", "a-decided")).thenReturn(Optional.of(
                PhaseSubmission.builder().status(PhaseSubmission.SubmissionStatus.GRADED)
                        .decisionStatus(PhaseSubmission.DecisionStatus.ACCEPTED).build()));

        Map<String, Object> check = service.getActivationCheck("p2");

        assertEquals("Phase 1", check.get("closingPhaseName"));
        assertEquals(1L, check.get("notSubmitted"));
        assertEquals(1L, check.get("awaitingDecision"));
    }
}

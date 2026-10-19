package tn.enicarthage.backend.service;

import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import tn.enicarthage.backend.entity.Event;
import tn.enicarthage.backend.entity.Phase;
import tn.enicarthage.backend.repository.ApplicationRepository;
import tn.enicarthage.backend.repository.EventRepository;
import tn.enicarthage.backend.repository.PhaseRepository;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EventServiceTest {

    @Mock private EventRepository eventRepository;
    @Mock private PhaseRepository phaseRepository;
    @Mock private ApplicationRepository applicationRepository;
    @Mock private PhaseService phaseService;
    @Mock private EventSubscriptionService eventSubscriptionService;
    @Mock private EntityManager entityManager;

    @InjectMocks
    private EventService service;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(service, "entityManager", entityManager);
        lenient().when(eventRepository.save(any())).thenAnswer(a -> a.getArgument(0));
        lenient().when(eventRepository.findById(anyString()))
                .thenAnswer(a -> Optional.of(Event.builder().eventId(a.getArgument(0)).build()));
    }

    @Test
    void createEvent_fillsTheDefaults_andStartsAsDraft() {
        service.createEvent(Event.builder().title("AI Workshop").build());

        ArgumentCaptor<Event> saved = ArgumentCaptor.forClass(Event.class);
        verify(eventRepository).save(saved.capture());
        assertNotNull(saved.getValue().getEventId());
        assertEquals(Event.EventStatus.DRAFT, saved.getValue().getStatus());
        assertEquals(Event.EventType.SIMPLE, saved.getValue().getEventType());
        assertEquals(0, saved.getValue().getCurrentRegisteredCount());
        verify(phaseRepository, never()).saveAll(any());
    }

    @Test
    @SuppressWarnings("unchecked")
    void createIncubationEvent_withPitch_createsThreeInactivePhases_endingWithThePitch() {
        service.createEvent(Event.builder().title("AI Incubator")
                .eventType(Event.EventType.INCUBATION).hasPitch(true).build());

        ArgumentCaptor<List<Phase>> phases = ArgumentCaptor.forClass(List.class);
        verify(phaseRepository).saveAll(phases.capture());
        assertEquals(3, phases.getValue().size());
        assertTrue(phases.getValue().stream().noneMatch(p -> Boolean.TRUE.equals(p.getPhaseActive())));
        assertEquals(Phase.PhaseType.PITCH, phases.getValue().get(2).getPhaseType());
    }

    @Test
    @SuppressWarnings("unchecked")
    void createIncubationEvent_withoutPitch_createsTwoPhases() {
        service.createEvent(Event.builder().title("AI Incubator")
                .eventType(Event.EventType.INCUBATION).hasPitch(false).build());

        ArgumentCaptor<List<Phase>> phases = ArgumentCaptor.forClass(List.class);
        verify(phaseRepository).saveAll(phases.capture());
        assertEquals(2, phases.getValue().size());
    }

    @Test
    void anEventIsFull_whenItsParticipantsReachTheMaximum_registrationsForSimple_applicationsForIncubation() {
        Event workshop = Event.builder().eventId("w").eventType(Event.EventType.SIMPLE).maxParticipants(2).currentRegisteredCount(2).build();
        Event incubator = Event.builder().eventId("i").eventType(Event.EventType.INCUBATION).maxParticipants(2).currentRegisteredCount(0).build();
        Event unlimited = Event.builder().eventId("u").eventType(Event.EventType.INCUBATION).currentRegisteredCount(0).build();
        when(applicationRepository.findAll()).thenReturn(List.of(
                tn.enicarthage.backend.entity.Application.builder().targetEventId("i").build(),
                tn.enicarthage.backend.entity.Application.builder().targetEventId("i").build(),
                tn.enicarthage.backend.entity.Application.builder().targetEventId("u").build()));

        service.withParticipantCounts(List.of(workshop, incubator, unlimited));

        assertTrue(workshop.isFull());
        assertEquals(2L, incubator.getParticipantCount());
        assertTrue(incubator.isFull());
        assertFalse(unlimited.isFull()); // no maximum: never full
    }

    @Test
    void activate_onlyWorksOnADraftEvent() {
        Event active = Event.builder().eventId("e1").status(Event.EventStatus.ACTIVE).build();
        when(eventRepository.findById("e1")).thenReturn(Optional.of(active));

        assertThrows(IllegalStateException.class, () -> service.activateEvent("e1"));
    }
}

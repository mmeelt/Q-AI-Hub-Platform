package tn.enicarthage.backend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import tn.enicarthage.backend.entity.Event;
import tn.enicarthage.backend.entity.EventRegistration;
import tn.enicarthage.backend.exception.InvalidEmailException;
import tn.enicarthage.backend.repository.EventRegistrationRepository;
import tn.enicarthage.backend.repository.EventRepository;
import tn.enicarthage.backend.security.InputSanitizer;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EventRegistrationServiceTest {

    @Mock private EventRegistrationRepository registrationRepository;
    @Mock private EventRepository eventRepository;
    @Mock private EmailService emailService;
    @Mock private PlatformSettingService platformSettings;
    @Spy private InputSanitizer inputSanitizer = new InputSanitizer();

    @InjectMocks
    private EventRegistrationService service;

    private Event event;

    @BeforeEach
    void setUp() {
        event = Event.builder().eventId("e1").title("AI Workshop").eventType(Event.EventType.SIMPLE)
                .status(Event.EventStatus.ACTIVE).currentRegisteredCount(0).maxParticipants(2).build();
        lenient().when(eventRepository.findById("e1")).thenReturn(Optional.of(event));
        lenient().when(registrationRepository.save(any())).thenAnswer(a -> a.getArgument(0));
    }

    @Test
    void guest_canRegister_withoutAccountOrStartup() {
        EventRegistration reg = service.register("e1", " Sara ", " Sara@Mail.com ", "{}");

        assertEquals("Sara", reg.getParticipantName());
        assertEquals("sara@mail.com", reg.getParticipantEmail());
        assertEquals(1, event.getCurrentRegisteredCount());
        verify(emailService).sendEventRegistrationConfirmation(eq("sara@mail.com"), eq("Sara"), same(event));
    }

    @Test
    void draftOrClosedEvent_refusesRegistration() {
        event.setStatus(Event.EventStatus.DRAFT);
        assertThrows(IllegalStateException.class, () -> service.register("e1", "Sara", "sara@mail.com", "{}"));
        event.setStatus(Event.EventStatus.CLOSED);
        assertThrows(IllegalStateException.class, () -> service.register("e1", "Sara", "sara@mail.com", "{}"));
    }

    @Test
    void afterDeadline_refusesRegistration() {
        event.setApplicationDeadline(LocalDate.now().minusDays(1));
        assertThrows(IllegalStateException.class, () -> service.register("e1", "Sara", "sara@mail.com", "{}"));
    }

    @Test
    void fullEvent_refusesRegistration() {
        event.setCurrentRegisteredCount(2);
        assertThrows(IllegalStateException.class, () -> service.register("e1", "Sara", "sara@mail.com", "{}"));
    }

    @Test
    void duplicateEmail_refusesRegistration() {
        when(registrationRepository.existsByEventIdAndParticipantEmail("e1", "sara@mail.com")).thenReturn(true);
        assertThrows(IllegalStateException.class, () -> service.register("e1", "Sara", "sara@mail.com", "{}"));
    }

    @Test
    void invalidEmail_refusesRegistration() {
        assertThrows(InvalidEmailException.class, () -> service.register("e1", "Sara", "not-an-email", "{}"));
    }

    @Test
    void incubationEvent_mustUseTheApplicationFlow() {
        event.setEventType(Event.EventType.INCUBATION);
        assertThrows(IllegalStateException.class, () -> service.register("e1", "Sara", "sara@mail.com", "{}"));
    }
}

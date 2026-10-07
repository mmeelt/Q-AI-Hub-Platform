package tn.enicarthage.backend.service;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;
import tn.enicarthage.backend.entity.Event;
import tn.enicarthage.backend.entity.EventSubscription;
import tn.enicarthage.backend.repository.EventRepository;
import tn.enicarthage.backend.repository.EventSubscriptionRepository;
import tn.enicarthage.backend.repository.UserRepository;
import tn.enicarthage.backend.security.InputSanitizer;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EventSubscriptionServiceTest {

    @Mock private EventSubscriptionRepository subscriptionRepository;
    @Mock private EventRepository eventRepository;
    @Mock private UserRepository userRepository;
    @Mock private EmailService emailService;
    @Mock private NotificationService notificationService;
    @Spy private InputSanitizer inputSanitizer = new InputSanitizer();

    @InjectMocks
    private EventSubscriptionService service;

    private Event draft;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext(); // guest
        ReflectionTestUtils.setField(service, "frontendUrl", "http://localhost:5173");
        draft = Event.builder().eventId("e1").title("AI Bootcamp").status(Event.EventStatus.DRAFT)
                .eventType(Event.EventType.SIMPLE).build();
        lenient().when(eventRepository.findById("e1")).thenReturn(Optional.of(draft));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void guest_subscribesWithTheirEmail() {
        when(subscriptionRepository.findByEventIdAndEmailIgnoreCase("e1", "guest@test.com")).thenReturn(Optional.empty());

        service.subscribe("e1", " Guest@Test.com ");

        ArgumentCaptor<EventSubscription> cap = ArgumentCaptor.forClass(EventSubscription.class);
        verify(subscriptionRepository).save(cap.capture());
        assertEquals("guest@test.com", cap.getValue().getEmail());
        assertNull(cap.getValue().getUserId());
    }

    @Test
    void subscribingTwice_doesNotCreateADuplicate() {
        when(subscriptionRepository.findByEventIdAndEmailIgnoreCase("e1", "guest@test.com"))
                .thenReturn(Optional.of(new EventSubscription()));
        service.subscribe("e1", "guest@test.com");
        verify(subscriptionRepository, never()).save(any());
    }

    @Test
    void guestWithoutEmail_isRefused() {
        assertThrows(IllegalArgumentException.class, () -> service.subscribe("e1", " "));
    }

    @Test
    void alreadyOpenEvent_cannotBeSubscribed() {
        draft.setStatus(Event.EventStatus.ACTIVE);
        assertThrows(IllegalStateException.class, () -> service.subscribe("e1", "guest@test.com"));
    }

    @Test
    void openingTheEvent_emailsEachPendingSubscriberOnce() {
        EventSubscription guest = EventSubscription.builder().eventId("e1").email("guest@test.com").createdAt(LocalDateTime.now()).build();
        EventSubscription member = EventSubscription.builder().eventId("e1").email("user@test.com").userId("u1").createdAt(LocalDateTime.now()).build();
        when(subscriptionRepository.findByEventIdAndNotifiedAtIsNull("e1")).thenReturn(List.of(guest, member));

        assertEquals(2, service.notifySubscribers(draft));

        verify(emailService).sendEventOpened("guest@test.com", draft, "http://localhost:5173/events/e1/register");
        verify(emailService).sendEventOpened("user@test.com", draft, "http://localhost:5173/events/e1/register");
        verify(notificationService).createNotification(eq("u1"), contains("AI Bootcamp"), anyString(), eq("EVENT_OPENED"), anyString());
        assertNotNull(guest.getNotifiedAt());
        assertNotNull(member.getNotifiedAt());
    }
}

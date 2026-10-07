package tn.enicarthage.backend.service;

import tn.enicarthage.backend.entity.Event;
import tn.enicarthage.backend.entity.InvitationLog;
import tn.enicarthage.backend.entity.User;
import tn.enicarthage.backend.repository.EventRepository;
import tn.enicarthage.backend.repository.InvitationLogRepository;
import tn.enicarthage.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.ArrayList;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ExpertInvitationServiceTest {

    @Mock private EmailService emailService;
    @Mock private InvitationLogRepository invitationLogRepository;
    @Mock private UserRepository userRepository;
    @Mock private EventRepository eventRepository;
    @Mock private NotificationService notificationService;

    @InjectMocks
    private ExpertInvitationService expertInvitationService;

    private Event event;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(expertInvitationService, "registrationBaseUrl", "http://localhost:5173");
        event = Event.builder().eventId("event-1").title("AI Challenge").expertInvitations(new ArrayList<>()).build();
        lenient().when(eventRepository.findById("event-1")).thenReturn(Optional.of(event));
    }

    @Test
    void newExpert_getsRegistrationLink_andIsAddedToTheEvent() {
        when(userRepository.findByEmailAddress("judge@test.com")).thenReturn(Optional.empty());

        expertInvitationService.inviteExpert(" judge@test.com ", " Judge ", "event-1");

        ArgumentCaptor<InvitationLog> logCap = ArgumentCaptor.forClass(InvitationLog.class);
        verify(invitationLogRepository).save(logCap.capture());
        assertEquals("judge@test.com", logCap.getValue().getEmail());
        assertEquals("event-1", logCap.getValue().getEventId());

        // The expert is linked to the event right away (per-event judge access)
        assertEquals(1, event.getExpertInvitations().size());
        assertEquals("judge@test.com", event.getExpertInvitations().get(0).getEmail());

        ArgumentCaptor<String> link = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendExpertInvitation(eq("judge@test.com"), eq("Judge"), eq("AI Challenge"), link.capture(), isNull());
        assertTrue(link.getValue().startsWith("http://localhost:5173/register?invite="));
        assertTrue(link.getValue().contains(logCap.getValue().getInvitationId()));
    }

    @Test
    void existingAccount_getsLoginLinkToTheEventPage_andANotification() {
        User user = User.builder().userId("user-1").emailAddress("judge@test.com").build();
        when(userRepository.findByEmailAddress("judge@test.com")).thenReturn(Optional.of(user));

        expertInvitationService.inviteExpert("judge@test.com", "Judge", "event-1");

        ArgumentCaptor<String> link = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendExpertInvitation(eq("judge@test.com"), anyString(), anyString(), link.capture(), isNull());
        assertEquals("http://localhost:5173/login?redirect=%2Fexpert%2Fevent%2Fevent-1", link.getValue());
        verify(notificationService).createNotification(eq("user-1"), anyString(), anyString(), anyString(),
                eq("/expert/event/event-1"));
        assertEquals(User.ExpertRole.JUDGE, user.getExpertRole());
    }

    @Test
    void invitingTwice_doesNotDuplicateTheExpertOnTheEvent() {
        when(userRepository.findByEmailAddress(anyString())).thenReturn(Optional.empty());

        expertInvitationService.inviteExpert("judge@test.com", "Judge", "event-1");
        expertInvitationService.inviteExpert("JUDGE@test.com", "Judge", "event-1");

        assertEquals(1, event.getExpertInvitations().size());
    }

    @Test
    void buildRegistrationLink_urlEncodesInviteAndEmail() {
        String link = expertInvitationService.buildRegistrationLink("inv-1", "a+b@c.com");
        assertTrue(link.startsWith("http://localhost:5173/register?"));
        assertTrue(link.contains("invite=inv-1"));
        assertTrue(link.contains("email=a%2Bb%40c.com"));
    }

    @Test
    void participantInvitation_sendsAOneTimeRegisterLink() {
        when(userRepository.findByEmailAddress("founder@test.com")).thenReturn(Optional.empty());

        expertInvitationService.inviteParticipant(" Founder@Test.com ", "Welcome aboard!");

        ArgumentCaptor<InvitationLog> logCap = ArgumentCaptor.forClass(InvitationLog.class);
        verify(invitationLogRepository).save(logCap.capture());
        assertEquals(ExpertInvitationService.PARTICIPANT, logCap.getValue().getExpertRole());
        assertNull(logCap.getValue().getEventId());
        ArgumentCaptor<String> link = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendParticipantInvitation(eq("founder@test.com"), link.capture(), eq("Welcome aboard!"));
        assertTrue(link.getValue().contains("/register?invite=" + logCap.getValue().getInvitationId()));
    }

    @Test
    void participantInvitation_refusedWhenTheAccountExists() {
        when(userRepository.findByEmailAddress("founder@test.com"))
                .thenReturn(Optional.of(User.builder().userId("u1").emailAddress("founder@test.com").build()));
        assertThrows(IllegalStateException.class, () -> expertInvitationService.inviteParticipant("founder@test.com", null));
        verifyNoInteractions(emailService);
    }

    @Test
    void expertInvitation_withoutEvent_isRefused() {
        // an expert with no event would have nothing to judge
        assertThrows(IllegalArgumentException.class, () -> expertInvitationService.inviteExpert("judge@test.com", "Judge", null));
        verifyNoInteractions(invitationLogRepository, emailService);
    }

    @Test
    void expertInvitation_carriesThePersonalMessage() {
        when(userRepository.findByEmailAddress("judge@test.com")).thenReturn(Optional.empty());
        expertInvitationService.inviteExpert("judge@test.com", "Judge", "event-1", "Thanks for helping!");
        verify(emailService).sendExpertInvitation(eq("judge@test.com"), eq("Judge"), eq("AI Challenge"), anyString(), eq("Thanks for helping!"));
    }
}

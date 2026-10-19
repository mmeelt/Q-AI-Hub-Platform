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
import tn.enicarthage.backend.entity.Event;
import tn.enicarthage.backend.entity.Startup;
import tn.enicarthage.backend.entity.User;
import tn.enicarthage.backend.repository.*;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ApplicationServiceTest {

    @Mock private ApplicationRepository applicationRepository;
    @Mock private StartupRepository startupRepository;
    @Mock private UserRepository userRepository;
    @Mock private EmailService emailService;
    @Mock private NotificationService notificationService;
    @Mock private TeammateInvitationService teammateInvitationService;
    @Spy private ObjectMapper objectMapper = new ObjectMapper();
    @Mock private EventRepository eventRepository;
    @Mock private EventRegistrationRepository eventRegistrationRepository;
    @Mock private AdminRepository adminRepository;
    @Mock private TeammateInvitationRepository teammateInvitationRepository;
    @Mock private PlatformSettingService platformSettings;

    @InjectMocks
    private ApplicationService service;

    private Startup startup;

    @BeforeEach
    void setUp() {
        Event event = Event.builder().eventId("e1").title("AI Incubator").eventType(Event.EventType.INCUBATION)
                .status(Event.EventStatus.ACTIVE).applicationDeadline(LocalDate.now().plusDays(7)).build();
        startup = Startup.builder().startupId("s1").founderUserId("user-1").projectName("Test Project")
                .startupStatus(Startup.StartupStatus.DRAFT).build();
        lenient().when(eventRepository.findById("e1")).thenReturn(Optional.of(event));
        lenient().when(startupRepository.findById("s1")).thenReturn(Optional.of(startup));
        lenient().when(applicationRepository.save(any())).thenAnswer(a -> a.getArgument(0));
    }

    private Application newApplication() {
        return Application.builder().targetEventId("e1").linkedStartupId("s1")
                .initialApplicationAnswers("{\"rawDescription\":\"An AI tutor for students\"}").build();
    }

    @Test
    void submit_generatesATrackingCode_APP_followedBy6Characters_andStaysPending() {
        Application saved = service.submitApplication(newApplication(), "user-1");

        assertTrue(saved.getTrackingCode().matches("APP-[0-9A-F]{6}"), saved.getTrackingCode());
        assertEquals("PENDING", saved.getApplicationStatus());
        assertEquals("user-1", saved.getApplicantUserId());
    }

    @Test
    void trackingCodes_areDifferentForEachApplication() {
        Set<String> codes = new HashSet<>();
        for (int i = 0; i < 50; i++) {
            codes.add(service.submitApplication(newApplication(), "user-1").getTrackingCode());
        }
        assertEquals(50, codes.size());
    }

    @Test
    void submit_withoutPitchDescription_isRefused() {
        Application app = newApplication();
        app.setInitialApplicationAnswers("{\"rawDescription\":\" \"}");

        assertThrows(IllegalArgumentException.class, () -> service.submitApplication(app, "user-1"));
        verify(applicationRepository, never()).save(any());
    }

    @Test
    void submit_mustAnswerTheEventsRequiredQuestions_andKeepsTheAnswers() {
        eventRepository.findById("e1").orElseThrow().setFormFieldsJson(
                "[{\"id\":\"q1\",\"question\":\"Why this program?\",\"type\":\"textarea\",\"required\":true}]");

        Application unanswered = newApplication();
        assertThrows(IllegalArgumentException.class, () -> service.submitApplication(unanswered, "user-1"));
        verify(applicationRepository, never()).save(any());

        Application answered = Application.builder().targetEventId("e1").linkedStartupId("s1")
                .initialApplicationAnswers("{\"rawDescription\":\"An AI tutor\",\"eventAnswers\":{\"Why this program?\":\"To scale\"}}")
                .build();
        Application saved = service.submitApplication(answered, "user-1");
        assertTrue(saved.getInitialApplicationAnswers().contains("To scale"));
    }

    @Test
    void accept_setsAccepted_emailsTheApplicant_notifies_andActivatesTheStartup() {
        Application app = Application.builder().applicationId("a1").applicantUserId("user-1").targetEventId("e1")
                .linkedStartupId("s1").trackingCode("APP-ABC123").applicationStatus("PENDING").build();
        when(applicationRepository.findById("a1")).thenReturn(Optional.of(app));
        when(userRepository.findById("user-1"))
                .thenReturn(Optional.of(User.builder().userId("user-1").emailAddress("student@test.com").build()));

        Application accepted = service.acceptApplication("a1");

        assertEquals("ACCEPTED", accepted.getApplicationStatus());
        verify(emailService).sendApplicationAccepted("student@test.com", "Test Project", "APP-ABC123");
        verify(notificationService).createNotification(eq("user-1"), eq("Application Accepted"),
                contains("AI Incubator"), eq("APPLICATION_ACCEPTED"), anyString());
        assertEquals(Startup.StartupStatus.ACTIVE, startup.getStartupStatus());
    }

    @Test
    void schedulePitch_savesTheDate_andTellsTheApplicantAndTheEventsExperts() {
        Event event = eventRepository.findById("e1").orElseThrow();
        event.getExpertInvitations().add(new Event.ExpertInvite("judge@test.com", "Judge", null));
        Application app = Application.builder().applicationId("a1").applicantUserId("user-1").targetEventId("e1")
                .linkedStartupId("s1").applicationStatus("ACCEPTED").build();
        when(applicationRepository.findById("a1")).thenReturn(Optional.of(app));
        when(userRepository.findByEmailAddress("judge@test.com"))
                .thenReturn(Optional.of(User.builder().userId("judge-1").emailAddress("judge@test.com").build()));
        java.util.Date date = new java.util.GregorianCalendar(2026, java.util.Calendar.OCTOBER, 21, 15, 0).getTime();

        service.schedulePitch("a1", date);

        assertEquals(date, app.getPitchDate());
        verify(notificationService).createNotification(eq("user-1"), eq("Pitch Scheduled"),
                contains("21 October 2026 at 15:00"), eq("PITCH_SCHEDULED"));
        verify(notificationService).createNotification(eq("judge-1"), contains("AI Incubator"),
                eq("Test Project will pitch on Wednesday 21 October 2026 at 15:00."), eq("PITCH_SCHEDULED"), eq("/expert/event/e1"));
    }

    @Test
    void schedulePitch_withoutADate_isRefused() {
        when(applicationRepository.findById("a1")).thenReturn(Optional.of(Application.builder().applicationId("a1").build()));

        assertThrows(IllegalArgumentException.class, () -> service.schedulePitch("a1", null));
        verify(applicationRepository, never()).save(any());
    }

    @Test
    void accept_anAlreadyReviewedApplication_isRefused() {
        Application app = Application.builder().applicationId("a1").applicationStatus("REJECTED").build();
        when(applicationRepository.findById("a1")).thenReturn(Optional.of(app));

        assertThrows(IllegalStateException.class, () -> service.acceptApplication("a1"));
        verifyNoInteractions(emailService, notificationService);
    }
}

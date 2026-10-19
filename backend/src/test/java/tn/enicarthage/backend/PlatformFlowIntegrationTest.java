package tn.enicarthage.backend;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import tn.enicarthage.backend.entity.Admin;
import tn.enicarthage.backend.entity.User;
import tn.enicarthage.backend.exception.AiUnavailableException;
import tn.enicarthage.backend.repository.AdminRepository;
import tn.enicarthage.backend.repository.NotificationRepository;
import tn.enicarthage.backend.repository.PhaseSubmissionRepository;
import tn.enicarthage.backend.repository.UserRepository;
import tn.enicarthage.backend.security.JwtUtil;
import tn.enicarthage.backend.service.EmailService;
import tn.enicarthage.backend.service.GeminiService;

import java.time.LocalDate;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Whole journeys through the real API (security, controllers, services, H2 database).
 * Only the outside world is replaced: emails are captured and Gemini is simulated.
 */
@SpringBootTest(classes = CompetitionPlatformApplication.class)
@ActiveProfiles("test")
class PlatformFlowIntegrationTest {

    private static final String PASSWORD = "Str0ng!Passw0rd";

    @Autowired private WebApplicationContext context;
    @Autowired private ObjectMapper json;
    @Autowired private JwtUtil jwtUtil;
    @Autowired private AdminRepository adminRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private NotificationRepository notificationRepository;
    @Autowired private PhaseSubmissionRepository phaseSubmissionRepository;

    @MockitoBean private EmailService emailService;
    @MockitoBean private GeminiService geminiService;

    private MockMvc mvc;
    private String clientIp; // one per test, so the per-IP rate limits of one test don't affect another

    @BeforeEach
    void setUp() {
        // some unit tests leave a fake authentication on this thread: start from a clean one
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
        mvc =MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        clientIp = "10.0." + (int) (Math.random() * 250) + "." + (int) (Math.random() * 250);
    }

    // ── TC-01 / TC-02 / TC-03 : sign up, OTP, log in ───────────────

    @Test
    void signUp_withValidData_thenTheEmailedOtp_opensASession_andTheUserCanLogIn() throws Exception {
        String email = unique("student") + "@test.com";

        String token = registerAndVerify(email);

        User user = userRepository.findByEmailAddress(email).orElseThrow();
        assertNotEquals(PASSWORD, user.getPasswordHash());
        assertTrue(user.getPasswordHash().startsWith("$2")); // stored as a BCrypt hash
        perform(get("/api/users/profile"), token).andExpect(status().isOk());

        JsonNode login = body(perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("email", email, "password", PASSWORD))), null)
                .andExpect(status().isOk()));
        // either a new code is emailed, or the session opens directly (setting "code at every login" off)
        assertTrue(login.path("requiresOtp").asBoolean() || login.has("userId"));
    }

    // ── TC-04 : wrong password several times ──────────────────────

    @Test
    void wrongPasswordFiveTimes_locksTheAccount_evenForTheRightPassword() throws Exception {
        String email = unique("locked") + "@test.com";
        registerAndVerify(email);

        for (int i = 0; i < 5; i++) {
            perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                    .content(json.writeValueAsString(Map.of("email", email, "password", "Wrong!Pass1"))), null)
                    .andExpect(status().isUnauthorized());
        }
        MockHttpServletRequestBuilder rightPassword = post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("email", email, "password", PASSWORD)));
        // the same IP is first stopped by the rate limit (5 logins per minute)...
        perform(rightPassword, null).andExpect(status().isTooManyRequests());
        // ...and from another IP the account itself is locked
        clientIp = "10.1.1.1";
        perform(rightPassword, null).andExpect(status().isLocked());
    }

    // ── SYS-01 / ACC-01 / ACC-02 : the whole incubation journey ──

    @Test
    void studentJourney_applyTrackAcceptedSubmitPhase_withTheAdminManagingTheEvent() throws Exception {
        String admin = adminToken();

        // TC-05 : admin creates and opens an incubation event (its phases are created with it)
        String eventId = createIncubationEvent(admin, List.of());
        JsonNode phases = phasesOf(eventId);
        assertEquals(3, phases.size());
        String phase1 = phases.get(0).path("phaseId").asText();
        assertTrue(phases.get(0).path("phaseActive").asBoolean());

        // a student cannot do admin work
        String student = registerAndVerify(unique("founder") + "@test.com");
        perform(post("/api/events").contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"x\"}"), student)
                .andExpect(status().isForbidden());

        // TC-06 : student creates a startup and applies
        String startupId = body(perform(post("/api/startups").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("projectName", "EduBot", "businessSector", "EdTech",
                        "rawDescription", "An AI tutor"))), student)
                .andExpect(status().isOk())).path("startupId").asText();
        JsonNode application = body(perform(post("/api/applications/submit").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("targetEventId", eventId, "linkedStartupId", startupId,
                        "initialApplicationAnswers", "{\"rawDescription\":\"An AI tutor for students\"}"))), student)
                .andExpect(status().isOk()));
        String applicationId = application.path("applicationId").asText();
        String trackingCode = application.path("trackingCode").asText();
        assertTrue(trackingCode.matches("APP-[0-9A-F]{6}"), trackingCode);
        assertEquals("PENDING", application.path("applicationStatus").asText());

        // TC-07 : anyone can follow it with the code, without logging in
        assertEquals("PENDING", body(perform(get("/api/applications/track/" + trackingCode), null)
                .andExpect(status().isOk())).path("status").asText());
        perform(get("/api/applications/track/APP-000000"), null).andExpect(status().isNotFound());

        // a pending application cannot submit phase answers yet
        perform(post("/api/submissions").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("phaseId", phase1, "applicationId", applicationId,
                        "answersJson", "{\"q1\":\"answer\"}"))), student)
                .andExpect(status().isConflict());

        // TC-12 / TI-06 : admin accepts → status, email and in-app notification
        perform(put("/api/applications/" + applicationId + "/accept"), admin).andExpect(status().isOk());
        assertEquals("ACCEPTED", body(perform(get("/api/applications/track/" + trackingCode), null)
                .andExpect(status().isOk())).path("status").asText());
        String studentId = jwtUtil.extractUserId(student);
        verify(emailService).sendApplicationAccepted(anyString(), eq("EduBot"), eq(trackingCode));
        assertTrue(notificationRepository.findByTargetUserIdOrderByNotificationCreatedAtDesc(studentId).stream()
                .anyMatch(n -> "APPLICATION_ACCEPTED".equals(n.getNotificationType())));

        // TC-09 : student uploads a submission file
        String fileUrl = body(perform(multipart("/api/files/upload")
                .file(new MockMultipartFile("file", "business-plan.pdf", "application/pdf", "%PDF-1.4 test".getBytes()))
                .param("subfolder", "documents"), student)
                .andExpect(status().isOk())).path("fileUrl").asText();
        assertTrue(fileUrl.endsWith(".pdf"), fileUrl);

        // TI-05 : the phase submission is linked to the application
        perform(post("/api/submissions").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("phaseId", phase1, "applicationId", applicationId,
                        "answersJson", "{\"q1\":\"answer\",\"file\":\"" + fileUrl + "\"}"))), student)
                .andExpect(status().isCreated());
        assertTrue(phaseSubmissionRepository.findByPhaseIdAndSourceApplicationId(phase1, applicationId).isPresent());
        assertEquals(1, body(perform(get("/api/applications/my"), student).andExpect(status().isOk())).size());
    }

    // ── TC-08 : admin adds a phase to an event ────────────────────

    @Test
    void adminAddsAPhase_toAnEvent() throws Exception {
        String admin = adminToken();
        String eventId = createIncubationEvent(admin, List.of());

        JsonNode extra = body(perform(post("/api/phases/event/" + eventId).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("phaseName", "Demo Day",
                        "phaseOrder", 4, "phaseType", "QUESTIONNAIRE"))), admin)
                .andExpect(status().isCreated()));
        assertEquals("Demo Day", extra.path("phaseName").asText());
        assertEquals(4, phasesOf(eventId).size());
    }

    // ── TC-10 / ACC-03: judges score a pitch, the average is final ─

    @Test
    void twoJudgesScoreAPitch_theAverageIsTheFinalScore_andAnUninvitedJudgeIsRefused() throws Exception {
        String admin = adminToken();
        String judge1 = judgeToken(unique("judge1") + "@test.com");
        String judge2 = judgeToken(unique("judge2") + "@test.com");
        String outsider = judgeToken(unique("outsider") + "@test.com");
        String eventId = createIncubationEvent(admin, List.of(emailOf(judge1), emailOf(judge2)));
        String pitchPhase = phasesOf(eventId).get(2).path("phaseId").asText();

        String student = registerAndVerify(unique("pitcher") + "@test.com");
        String startupId = body(perform(post("/api/startups").contentType(MediaType.APPLICATION_JSON)
                .content("{\"projectName\":\"GreenAI\"}"), student).andExpect(status().isOk())).path("startupId").asText();
        String applicationId = body(perform(post("/api/applications/submit").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("targetEventId", eventId, "linkedStartupId", startupId,
                        "initialApplicationAnswers", "{\"rawDescription\":\"Green AI\"}"))), student)
                .andExpect(status().isOk())).path("applicationId").asText();
        perform(put("/api/applications/" + applicationId + "/accept"), admin).andExpect(status().isOk());

        long roundId = body(perform(post("/api/pitch-rounds/phase/" + pitchPhase).contentType(MediaType.APPLICATION_JSON)
                .content("{\"roundDate\":\"2030-01-15T10:00:00\"}"), admin)
                .andExpect(status().isCreated())).path("id").asLong();

        evaluate(roundId, applicationId, judge1, "{\"Problem\":5,\"Solution\":5,\"Target\":4,\"Motivation\":4,\"Pitch\":2}") // 20
                .andExpect(status().isCreated());
        evaluate(roundId, applicationId, judge2, "{\"Problem\":3,\"Solution\":3,\"Target\":3,\"Motivation\":3,\"Pitch\":4}") // 16
                .andExpect(status().isCreated());
        evaluate(roundId, applicationId, outsider, "{\"Problem\":5}").andExpect(status().isForbidden());
        evaluate(roundId, applicationId, judge1, "{\"Problem\":30}").andExpect(status().isBadRequest()); // above the max

        JsonNode summary = body(perform(get("/api/pitch-rounds/" + roundId + "/summary"), admin)
                .andExpect(status().isOk())).get(0);
        assertEquals(2, summary.path("judgeCount").asInt());
        assertEquals(18.0, summary.path("averageScore").asDouble());
        assertEquals("PASSED", summary.path("finalDecision").asText()); // 18 >= 60% of 25
    }

    // ── An expert is a limited admin: evaluates, never participates ─

    @Test
    void expert_cannotCreateAStartup_applyOrRegisterAsAParticipant() throws Exception {
        String admin = adminToken();
        String judge = expertToken(unique("expert") + "@test.com");
        String eventId = createIncubationEvent(admin, List.of(emailOf(judge)));

        perform(post("/api/startups").contentType(MediaType.APPLICATION_JSON)
                .content("{\"projectName\":\"JudgeCo\"}"), judge).andExpect(status().isForbidden());
        perform(post("/api/applications/submit").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("targetEventId", eventId,
                        "initialApplicationAnswers", "{\"rawDescription\":\"x\"}"))), judge)
                .andExpect(status().isForbidden());
        perform(post("/api/registrations/event/" + eventId).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("participantName", "Judge",
                        "participantEmail", emailOf(judge)))), judge)
                .andExpect(status().isForbidden());
    }

    @Test
    void participantInvitedAsAnExpert_logsInAsAnExpert_andCannotCreateAStartup() throws Exception {
        String email = unique("invited") + "@test.com";
        createIncubationEvent(adminToken(), List.of(email));

        String session = registerAndVerify(email);

        assertEquals("JUDGE", jwtUtil.extractRole(session));
        perform(post("/api/startups").contentType(MediaType.APPLICATION_JSON)
                .content("{\"projectName\":\"NotAllowed\"}"), session).andExpect(status().isForbidden());
    }

    // ── TC-11 / SYS-02 / NF-02 : description improved by Gemini ───

    @Test
    void refineDescription_returnsGeminisText_andA503WhenGeminiIsDown() throws Exception {
        when(geminiService.getAiFeedback(anyString())).thenReturn("EduBot is an AI tutor that adapts to each student.");

        JsonNode refined = body(perform(post("/api/startups/refine-description").contentType(MediaType.APPLICATION_JSON)
                .content("{\"description\":\"ai tutor for student\"}"), null).andExpect(status().isOk()));
        assertEquals("EduBot is an AI tutor that adapts to each student.", refined.path("refinedDescription").asText());

        when(geminiService.getAiFeedback(anyString())).thenThrow(new AiUnavailableException("Gemini request failed"));
        perform(post("/api/startups/refine-description").contentType(MediaType.APPLICATION_JSON)
                .content("{\"description\":\"ai tutor for student\"}"), null)
                .andExpect(status().isServiceUnavailable());

        perform(post("/api/startups/refine-description").contentType(MediaType.APPLICATION_JSON)
                .content("{\"description\":\"\"}"), null).andExpect(status().isBadRequest());
    }

    // ── helpers ───────────────────────────────────────────────────

    private ResultActions perform(MockHttpServletRequestBuilder request, String token) throws Exception {
        request.with(r -> { r.setRemoteAddr(clientIp); return r; });
        if (token != null) request.header("Authorization", "Bearer " + token);
        return mvc.perform(request);
    }

    private JsonNode body(ResultActions result) throws Exception {
        MvcResult r = result.andReturn();
        return json.readTree(r.getResponse().getContentAsString());
    }

    private String registerAndVerify(String email) throws Exception {
        String otpSession = body(perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("email", email, "password", PASSWORD,
                        "fullName", "Test Student", "universityName", "ENICarthage"))), null)
                .andExpect(status().isOk())).path("otpSessionId").asText();

        ArgumentCaptor<String> code = ArgumentCaptor.forClass(String.class);
        verify(emailService, atLeastOnce()).sendOtpCodeNow(eq(email), any(), code.capture(), anyInt());

        MvcResult verified = perform(post("/api/auth/verify-otp").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("otpSessionId", otpSession, "otpCode", code.getValue()))), null)
                .andExpect(status().isOk()).andReturn();
        return verified.getResponse().getHeaders("Set-Cookie").stream()
                .filter(c -> c.startsWith("qa_access="))
                .map(c -> c.substring("qa_access=".length(), c.indexOf(';')))
                .findFirst().orElseThrow(() -> new AssertionError("no access cookie after OTP"));
    }

    private String adminToken() {
        String id = unique("admin");
        adminRepository.save(Admin.builder().adminId(id).adminEmail(id + "@test.com").passwordHash("x").build());
        return jwtUtil.generateToken(id, id + "@test.com", "ADMIN");
    }

    private String judgeToken(String email) {
        String id = UUID.randomUUID().toString();
        userRepository.save(User.builder().userId(id).emailAddress(email).fullName("Judge").passwordHash("x")
                .accountCreatedAt(new Date()).userStatus(User.UserStatus.ACTIVE)
                .failedLoginAttempts(0).accountLocked(false).build());
        return jwtUtil.generateToken(id, email, "USER");
    }

    // An account created from an expert invitation: its token carries the expert role, not USER
    private String expertToken(String email) {
        String id = UUID.randomUUID().toString();
        userRepository.save(User.builder().userId(id).emailAddress(email).fullName("Expert").passwordHash("x")
                .expertRole(User.ExpertRole.JUDGE).accountCreatedAt(new Date()).userStatus(User.UserStatus.ACTIVE)
                .failedLoginAttempts(0).accountLocked(false).build());
        return jwtUtil.generateToken(id, email, "JUDGE");
    }

    private String emailOf(String token) {
        return userRepository.findById(jwtUtil.extractUserId(token)).orElseThrow().getEmailAddress();
    }

    private String createIncubationEvent(String admin, List<String> judgeEmails) throws Exception {
        Map<String, Object> event = Map.of(
                "title", "AI Incubator " + unique(""),
                "category", "AI",
                "eventType", "INCUBATION",
                "hasPitch", true,
                "applicationDeadline", LocalDate.now().plusDays(30).toString(),
                "formFieldsJson", "[{\"label\":\"Describe your idea\",\"type\":\"text\"}]",
                "expertInvitations", judgeEmails.stream().map(e -> Map.of("email", e, "role", "Judge")).toList());
        JsonNode created = body(perform(post("/api/events").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(event)), admin).andExpect(status().isCreated()));
        assertEquals("DRAFT", created.path("status").asText());
        String eventId = created.path("eventId").asText();

        perform(put("/api/events/" + eventId + "/activate"), admin).andExpect(status().isOk());
        assertEquals("ACTIVE", body(perform(get("/api/events/" + eventId), null)).path("status").asText());
        return eventId;
    }

    private JsonNode phasesOf(String eventId) throws Exception {
        return body(perform(get("/api/phases/event/" + eventId), adminToken()).andExpect(status().isOk()));
    }

    private ResultActions evaluate(long roundId, String applicationId, String judge, String scores) throws Exception {
        return perform(post("/api/pitch-rounds/" + roundId + "/evaluate").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("applicationId", applicationId, "scoresJson", scores,
                        "decision", "PASSED", "feedback", "Clear pitch"))), judge);
    }

    private static String unique(String prefix) {
        return prefix + UUID.randomUUID().toString().substring(0, 8);
    }
}

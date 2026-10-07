package tn.enicarthage.backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import tn.enicarthage.backend.dto.ApplicationResponse;
import tn.enicarthage.backend.entity.Application;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/**
 * "Show anonymised to jury" setting: judges (never admins, never the applicant) see
 * "Startup 7F3A" instead of the startup name, and no founder name, email or identifying answers.
 * Always works on copies, so hidden values can never be saved back by accident.
 */
@Component
@RequiredArgsConstructor
public class ApplicantAnonymizer {

    // Answer keys that identify the startup or its people
    private static final Set<String> IDENTIFYING_KEYS = Set.of(
            "projectName", "startupName", "primaryFounderName", "coFounderNames", "teammates",
            "companyWebsiteUrl", "website", "githubUrl", "companyLogoUrl", "logoUrl", "linkedin", "email");

    private final PlatformSettingService platformSettings;
    private final JudgeAccessService judgeAccess;
    private final ObjectMapper objectMapper;

    /** True when the current viewer is a judge (not admin, not the applicant) and the setting is on. */
    public boolean appliesTo(Application app) {
        if (!platformSettings.anonymousToJury() || judgeAccess.isAdmin()) return false;
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getName().equals(app.getApplicantUserId())) return false;
        return judgeAccess.canJudgeEvent(app.getTargetEventId());
    }

    /** For lists where the viewer is a judge of the event (or an admin). */
    public boolean appliesToJudgesOfEvent() {
        return platformSettings.anonymousToJury() && !judgeAccess.isAdmin();
    }

    public static String label(String applicationId) {
        String code = applicationId == null ? "" : applicationId.replaceAll("[^A-Za-z0-9]", "");
        return "Startup " + (code.length() >= 4 ? code.substring(0, 4) : code).toUpperCase();
    }

    public ApplicationResponse anonymize(ApplicationResponse r) {
        r.setStartupName(label(r.getApplicationId()));
        r.setFounderName("Anonymous founder");
        r.setFounderEmail("");
        r.setApplicantUserId(null);
        r.setLinkedStartupId(null);
        r.setInitialApplicationAnswers(stripAnswers(r.getInitialApplicationAnswers()));
        r.setFollowupAnswersJson(null);
        return r;
    }

    public Application anonymizedCopy(Application app) {
        return Application.builder()
                .applicationId(app.getApplicationId())
                .targetEventId(app.getTargetEventId())
                .trackingCode(app.getTrackingCode())
                .applicationStatus(app.getApplicationStatus())
                .applicationSubmittedAt(app.getApplicationSubmittedAt())
                .initialApplicationAnswers(stripAnswers(app.getInitialApplicationAnswers()))
                .pitchDate(app.getPitchDate())
                .followupStatus(app.getFollowupStatus())
                .followupQuestionsJson(app.getFollowupQuestionsJson())
                .build();
    }

    /** For candidate lists ({applicationId, startupName, founderName, founderEmail}). */
    public Map<String, Object> anonymize(Map<String, Object> candidate) {
        Map<String, Object> copy = new LinkedHashMap<>(candidate);
        copy.put("startupName", label((String) candidate.get("applicationId")));
        copy.put("founderName", "Anonymous founder");
        copy.put("founderEmail", "");
        return copy;
    }

    private String stripAnswers(String json) {
        if (json == null || json.isBlank()) return json;
        try {
            Map<String, Object> answers = objectMapper.readValue(json, new TypeReference<LinkedHashMap<String, Object>>() {});
            answers.keySet().removeIf(IDENTIFYING_KEYS::contains);
            return objectMapper.writeValueAsString(answers);
        } catch (Exception e) {
            return "{}"; // unreadable answers: show nothing rather than leak names
        }
    }
}

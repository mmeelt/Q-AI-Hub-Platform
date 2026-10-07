package tn.enicarthage.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ApplicationResponse {
    private String applicationId;
    private String applicantUserId;
    private String targetEventId;
    private String eventTitle;       // resolved from Event table
    private String startupName;      // resolved from Startup table
    private String businessSector;   // resolved from Startup table
    private String linkedStartupId;
    private String trackingCode;
    private String applicationStatus;

    // Added for EventsManager matching (Issue 7)
    private String founderName;
    private String founderEmail;

    private Date applicationSubmittedAt;
    private String initialApplicationAnswers;
    private Date pitchDate;
    private String rejectionReason;

    // Follow-up workflow (persisted on Application)
    private String followupStatus;
    private String followupQuestionsJson;
    private String followupAnswersJson;
}

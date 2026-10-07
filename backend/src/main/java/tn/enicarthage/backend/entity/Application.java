package tn.enicarthage.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.Date;
import java.util.UUID;

@Entity
@Table(name = "applications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Application {

    @Id
    @Builder.Default
    private String applicationId = UUID.randomUUID().toString();

    @Column(name = "applicant_user_id")
    private String applicantUserId;

    @Column(name = "target_event_id")
    private String targetEventId;

    @Column(name = "linked_startup_id")
    private String linkedStartupId;

    @Column(name = "tracking_code")
    private String trackingCode;

    @Column(name = "application_status")
    private String applicationStatus;

    @Column(name = "application_submitted_at")
    @Temporal(TemporalType.TIMESTAMP)
    @Builder.Default
    private Date applicationSubmittedAt = new Date();

    @Column(name = "initial_application_answers", columnDefinition = "TEXT")
    private String initialApplicationAnswers;

    @Column(name = "pitch_date")
    @Temporal(TemporalType.TIMESTAMP)
    private Date pitchDate;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    // ── Follow-up questions workflow (admin -> founder) ───────────────

    /**
     * none | waiting_answers | answers_received
     */
    @Column(name = "followup_status")
    @Builder.Default
    private String followupStatus = "none";

    @Column(name = "followup_questions_json", columnDefinition = "TEXT")
    private String followupQuestionsJson;

    @Column(name = "followup_answers_json", columnDefinition = "TEXT")
    private String followupAnswersJson;
}

package tn.enicarthage.backend.dto;

import lombok.*;
import tn.enicarthage.backend.entity.PhaseSubmission;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PhaseSubmissionResponse {
    private Long id;
    private String phaseId;
    private String sourceApplicationId;
    private String answersJson;
    private Double evaluationScore;
    private String evaluatorFeedback;
    private PhaseSubmission.SubmissionStatus status;
    private PhaseSubmission.DecisionStatus decisionStatus;
    private PhaseSubmission.DecisionStatus outcome;   // effective result: decision, or Phase 2+ grading rule
    private LocalDateTime submittedAt;
    private Integer phaseOrder;
    private Boolean phaseActive;   // whether the phase is currently open for submissions

    // User/Startup info for the UI
    private UserInfo user;

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserInfo {
        private String fullName;
        private String emailAddress;
        private String startupName;
    }
}

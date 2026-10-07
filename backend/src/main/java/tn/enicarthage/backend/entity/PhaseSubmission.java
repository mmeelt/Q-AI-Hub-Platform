package tn.enicarthage.backend.entity;
import tn.enicarthage.backend.entity.Phase;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

@Entity
@Table(name = "phase_submissions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PhaseSubmission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "phase_id", referencedColumnName = "phase_id", nullable = false)
    private Phase phase;

    // Mock — Dev 3 will replace with @ManyToOne Application
    private String sourceApplicationId;

    // Answers stored as JSON string
    // ex: {"githubLink":"https://github.com/...","description":"Our MVP is..."}
    @Column(columnDefinition = "TEXT")
    private String answersJson;

    @Min(0) @Max(100)
    private Double evaluationScore;

    @Column(columnDefinition = "TEXT")
    private String evaluatorFeedback;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SubmissionStatus status;

    @Column(nullable = false)
    private LocalDateTime submittedAt;

    // ── Business methods ──────────────────────────────────────────

    public boolean submitAnswers(String answersJson) {
        this.answersJson = (answersJson == null || answersJson.isBlank()) ? "{}" : answersJson;
        this.status = SubmissionStatus.SUBMITTED;
        this.submittedAt = LocalDateTime.now();
        return true;
    }

    public boolean updateAnswers(String answersJson) {
        if (this.status == SubmissionStatus.GRADED) return false;
        this.answersJson = (answersJson == null || answersJson.isBlank()) ? "{}" : answersJson;
        return true;
    }

    public void gradeSubmission(Double score, String feedback) {
        this.evaluationScore = score;
        this.evaluatorFeedback = feedback;
        this.status = SubmissionStatus.GRADED;
    }

    /**
     * Outcome as seen by the admin and the participant.
     * An explicit admin decision always wins. Without one, Phase 1 stays PENDING (a score never
     * accepts or rejects it); later questionnaire phases keep their grading rule (score >= 50).
     */
    public DecisionStatus getOutcome() {
        if (decisionStatus != null && decisionStatus != DecisionStatus.PENDING) return decisionStatus;
        boolean scoreDecides = phase != null && phase.getPhaseOrder() != null && phase.getPhaseOrder() > 1
                && status == SubmissionStatus.GRADED && evaluationScore != null;
        if (!scoreDecides) return DecisionStatus.PENDING;
        return evaluationScore >= 50.0 ? DecisionStatus.ACCEPTED : DecisionStatus.REJECTED;
    }

    public boolean isPassed() {
        return getOutcome() == DecisionStatus.ACCEPTED;
    }

    public Map<String, Object> getSubmissionDetails() {
        Map<String, Object> details = new HashMap<>();
        details.put("id", this.id);
        details.put("phaseId", this.phase != null ? this.phase.getPhaseId() : null);
        details.put("phaseName", this.phase != null ? this.phase.getPhaseName() : null);
        details.put("sourceApplicationId", this.sourceApplicationId);
        details.put("status", this.status);
        details.put("decisionStatus", this.decisionStatus);
        details.put("evaluationScore", this.evaluationScore);
        details.put("evaluatorFeedback", this.evaluatorFeedback);
        details.put("isPassed", isPassed());
        details.put("submittedAt", this.submittedAt);
        return details;
    }

    // ── Enum ─────────────────────────────────────────────────────
    
    public enum DecisionStatus {
        PENDING, ACCEPTED, REJECTED
    }

    public enum SubmissionStatus {
        DRAFT, SUBMITTED, GRADED
    }

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private DecisionStatus decisionStatus = DecisionStatus.PENDING;
}

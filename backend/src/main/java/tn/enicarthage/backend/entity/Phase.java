package tn.enicarthage.backend.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "phases")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Phase {

    @Id
    @Column(name = "phase_id")
    private String phaseId;

    @Enumerated(EnumType.STRING)
    @Column(name = "phase_type", nullable = true, columnDefinition = "varchar(255) default 'QUESTIONNAIRE'")
    @Builder.Default
    private PhaseType phaseType = PhaseType.QUESTIONNAIRE;

    public enum PhaseType {
        QUESTIONNAIRE,
        PITCH
    }

    @Column(name = "event_id", nullable = false)
    private String eventId;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", nullable = false, insertable = false, updatable = false)
    private Event event;

    @Column(nullable = false)
    private String phaseName;

    @Column(nullable = false)
    private Integer phaseOrder;

    private LocalDate startDate;
    private LocalDate endDate;

    @Column(nullable = false)
    @Builder.Default
    private Boolean phaseActive = false;

    /**
     * Once a later phase is activated, earlier phases are locked forever.
     * Locked phases cannot be re-activated or modified.
     */
    @Column(nullable = false)
    @Builder.Default
    private Boolean phaseLocked = false;

    // Dynamic form fields stored as JSON string
    // ex: [{"label":"GitHub Link","type":"URL","required":true}, ...]
    @Column(columnDefinition = "TEXT")
    private String formFieldsJson;

    @JsonIgnore
    @OneToMany(mappedBy = "phase", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<PhaseSubmission> submissions = new ArrayList<>();

    // ── Business methods ──────────────────────────────────────────


    public void activatePhase() {
        this.phaseActive = true;
    }

    public void deactivatePhase() {
        this.phaseActive = false;
    }

    public void lockPhase() {
        this.phaseLocked = true;
        this.phaseActive = false;
    }

    public void updateFormFields(String formFieldsJson) {
        this.formFieldsJson = formFieldsJson;
    }

    @JsonIgnore
    public List<PhaseSubmission> getPhaseSubmissions() {
        return this.submissions != null ? this.submissions : new ArrayList<>();
    }

    public Map<String, Object> calculatePhaseResults() {
        Map<String, Object> results = new HashMap<>();

        int total = submissions != null ? submissions.size() : 0;
        long passed = submissions != null
                ? submissions.stream().filter(PhaseSubmission::isPassed).count()
                : 0;
        long failed = submissions != null
                ? submissions.stream().filter(sub -> sub.getOutcome() == PhaseSubmission.DecisionStatus.REJECTED).count()
                : 0;
        long pendingReview = total - passed - failed;

        double avgScore = submissions != null
                ? submissions.stream()
                .filter(s -> s.getEvaluationScore() != null)
                .mapToDouble(PhaseSubmission::getEvaluationScore)
                .average()
                .orElse(0.0)
                : 0.0;

        results.put("phaseId", this.phaseId);
        results.put("phaseName", this.phaseName);
        results.put("totalSubmissions", total);
        results.put("passed", passed);
        results.put("failed", failed);
        results.put("pendingReview", pendingReview);
        results.put("averageScore", Math.round(avgScore * 100.0) / 100.0);

        return results;
    }
}

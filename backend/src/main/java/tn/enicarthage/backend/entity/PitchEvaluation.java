package tn.enicarthage.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.Date;
import java.util.UUID;

@Entity
@Table(name = "pitch_evaluations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PitchEvaluation {

    @Id
    @Builder.Default
    private String evaluationId = UUID.randomUUID().toString();

    /**
     * The applicationId this cumulative evaluation belongs to.
     * This is the primary lookup key — one record per application.
     */
    @Column(name = "application_id", unique = true)
    private String applicationId;

    /**
     * The pitch phase id (Phase 3) this evaluation is linked to.
     */
    @Column(name = "pitch_phase_id")
    private String pitchPhaseId;

    /** Admin who initiated the evaluation (actual admin ID). */
    @Column(name = "evaluator_admin_id")
    private String evaluatorAdminId;

    // ── Cumulative Criteria Scores ────────────────────────────────
    private Integer scoreTechnicalDepth;
    private Integer scoreBusinessModel;
    private Integer scoreOralPresentation;
    private Integer scoreMarketPotential;
    private Integer scoreTeamCapability;
    private Integer scoreInnovation;

    /** Sum of all per-round scores across all pitch rounds. */
    private Double finalTotalScore;

    @Column(columnDefinition = "TEXT")
    private String aiGeneratedFeedback;

    @Column(columnDefinition = "TEXT")
    private String evaluatorNotes;

    /** APPROVED | WAITLISTED | REJECTED */
    private String finalDecision;

    @Temporal(TemporalType.TIMESTAMP)
    @Builder.Default
    private Date evaluationSubmittedAt = new Date();
}

package tn.enicarthage.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "pitch_round_results")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PitchRoundResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pitch_round_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private PitchRound pitchRound;

    // Reference to the application (startup)
    private String applicationId;

    // Scores per criterion stored as JSON
    // ex: {"Problem": 4.5, "Solution": 3.0, "Target": 5.0}
    @Column(columnDefinition = "TEXT")
    private String scoresJson;

    private Double totalScore;

    @Enumerated(EnumType.STRING)
    private RoundDecision decision;

    @Column(columnDefinition = "TEXT")
    private String feedback;

    @Column(columnDefinition = "TEXT")
    private String aiFeedback;

    private String evaluatedBy; // admin or expert email

    private LocalDateTime evaluatedAt;

    public enum RoundDecision {
        PASSED,
        REJECTED
    }
}

package tn.enicarthage.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "pitch_rounds")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PitchRound {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "phase_id", referencedColumnName = "phase_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Phase phase;

    @Column(nullable = false)
    private Integer roundNumber;

    @Column(nullable = false)
    private String roundName;

    private LocalDateTime roundDate;

    // Dynamic criteria stored as JSON
    // Default based on roundNumber:
    // Round 1 → [{"criterion":"Problem","maxPoints":5},{"criterion":"Solution","maxPoints":5},...]
    // Round 2 → [{"criterion":"Innovation","maxPoints":5},...]
    // Round 3 → [{"criterion":"Value Proposition","maxPoints":5},...]
    @Column(columnDefinition = "TEXT")
    private String criteriaJson;

    // Set when the admin sends the averaged results to the startups;
    // founders only see a round's results after this.
    private LocalDateTime resultsSentAt;

    // Never serialized: judges must not see each other's scores through the rounds list
    @com.fasterxml.jackson.annotation.JsonIgnore
    @Builder.Default
    @OneToMany(mappedBy = "pitchRound", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PitchRoundResult> results = new ArrayList<>();
}

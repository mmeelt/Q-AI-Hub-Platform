package tn.enicarthage.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/** One expert's grade of one application (/20). The admin decides on the average of all grades. */
@Entity
@Table(name = "application_reviews",
        uniqueConstraints = @UniqueConstraint(name = "uk_application_review_reviewer",
                columnNames = {"application_id", "reviewer_user_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApplicationReview {

    public static final double MAX_SCORE = 20.0;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "application_id", nullable = false)
    private String applicationId;

    @Column(name = "reviewer_user_id", nullable = false)
    private String reviewerUserId;

    private String reviewerEmail;

    private String reviewerName;

    @Column(nullable = false)
    private Double score;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Recommendation recommendation;

    @Column(columnDefinition = "TEXT")
    private String comment;

    @Column(nullable = false)
    private LocalDateTime reviewedAt;

    public enum Recommendation { ACCEPT, REJECT }
}

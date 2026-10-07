package tn.enicarthage.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/** "Notify me": someone wants an email when a coming-soon event opens. */
@Entity
@Table(name = "event_subscriptions",
        uniqueConstraints = @UniqueConstraint(name = "uk_event_subscription", columnNames = {"event_id", "email"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EventSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_id", nullable = false)
    private String eventId;

    @Column(nullable = false)
    private String email;

    // Set when the subscriber is logged in (also gets an in-app notification)
    @Column(name = "user_id")
    private String userId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    // When the "event is open" email was sent (each subscriber is notified once)
    @Column(name = "notified_at")
    private LocalDateTime notifiedAt;
}

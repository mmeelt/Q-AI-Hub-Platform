package tn.enicarthage.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "event_registrations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EventRegistration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "event_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Event event;

    @Column(nullable = false)
    private String participantName;

    @Column(nullable = false)
    private String participantEmail;

    // Answers to the event form questions
    @Column(columnDefinition = "TEXT")
    private String answersJson;

    @Column(nullable = false)
    private LocalDateTime registeredAt;

    @PrePersist
    public void prePersist() {
        this.registeredAt = LocalDateTime.now();
    }
}

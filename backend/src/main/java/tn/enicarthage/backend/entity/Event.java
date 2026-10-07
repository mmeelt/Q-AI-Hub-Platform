package tn.enicarthage.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import jakarta.persistence.Embeddable;
import com.fasterxml.jackson.annotation.JsonIgnore;


@Entity
@Table(name = "events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Event {

    @Id
    @Column(name = "event_id")
    private String eventId;

    // Mock — Dev 1 will replace with @ManyToOne Admin
    @Column(name = "organizer_admin_id")
    private String organizerAdminId;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "category", nullable = false)
    private String category;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String location;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "application_deadline")
    private LocalDate applicationDeadline;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private EventStatus status;

    // SIMPLE = formation, journée club, etc.
    // INCUBATION = startup incubation with phases and pitch
    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false)
    private EventType eventType;

    // Only relevant if eventType = INCUBATION
    @Column(name = "has_pitch", nullable = false)
    @Builder.Default
    private Boolean hasPitch = false;

    @Column(name = "max_participants")
    private Integer maxParticipants;

    @Column(name = "current_registered_count")
    private Integer currentRegisteredCount;

    @Column(name = "cover_image_url")
    private String coverImageUrl;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "event_tags", joinColumns = @JoinColumn(name = "event_id"))
    @Column(name = "tag")
    private List<String> tags;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "event_partners", joinColumns = @JoinColumn(name = "event_id"))
    @Column(name = "partner")
    private List<String> partners;

    @Column(columnDefinition = "TEXT")
    private String formFieldsJson;

    // Not stored: filled by the admin events list (applications, or registrations for simple events)
    @Transient
    private Long participantCount;

    @OneToMany(mappedBy = "event", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("phaseOrder ASC")
    @Builder.Default
    private List<Phase> phases = new ArrayList<>();

    // ── Business methods ──────────────────────────────────────────

    public boolean isOpenForApplications() {
        if (status != EventStatus.ACTIVE) return false;
        if (applicationDeadline == null) return true;
        return !LocalDate.now().isAfter(applicationDeadline); // the deadline day itself is still open
    }

    public boolean isFull() {
        if (maxParticipants == null) return false;
        return currentRegisteredCount != null && currentRegisteredCount >= maxParticipants;
    }

    public void incrementRegistered() {
        if (this.currentRegisteredCount == null) this.currentRegisteredCount = 0;
        this.currentRegisteredCount++;
    }

    public Phase getActivePhase() {
        if (phases == null || phases.isEmpty()) return null;
        return phases.stream()
                .filter(p -> Boolean.TRUE.equals(p.getPhaseActive()))
                .findFirst()
                .orElse(null);
    }

    public Phase advanceToNextPhase() {
        if (phases == null || phases.isEmpty()) return null;

        Phase currentPhase = getActivePhase();
        if (currentPhase != null) {
            // Once we move forward, previous phase is locked forever.
            currentPhase.lockPhase();
        }

        int nextOrder = (currentPhase != null) ? currentPhase.getPhaseOrder() + 1 : 1;
        Phase nextPhase = phases.stream()
                .filter(p -> p.getPhaseOrder() == nextOrder)
                .filter(p -> !Boolean.TRUE.equals(p.getPhaseLocked()))
                .findFirst()
                .orElse(null);

        if (nextPhase != null) {
            nextPhase.setPhaseActive(true);
        }

        return nextPhase;
    }

    public Map<String, Object> generateEventStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("eventId", this.eventId);
        stats.put("title", this.title);
        stats.put("status", this.status);
        stats.put("eventType", this.eventType);
        stats.put("hasPitch", this.hasPitch);
        stats.put("maxParticipants", this.maxParticipants);
        stats.put("currentRegisteredCount", this.currentRegisteredCount != null ? this.currentRegisteredCount : 0);
        stats.put("totalPhases", this.phases != null ? this.phases.size() : 0);
        stats.put("activePhase", getActivePhase() != null ? getActivePhase().getPhaseName() : null);
        stats.put("isOpen", isOpenForApplications());
        stats.put("isFull", isFull());
        return stats;
    }

    // ── Enums ─────────────────────────────────────────────────────

    public enum EventStatus {
        DRAFT,
        ACTIVE,
        CLOSED
    }

    public enum EventType {
        SIMPLE,
        INCUBATION
    }

    // ── Expert Invitations ────────────────────────────────────────

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "event_experts", joinColumns = @JoinColumn(name = "event_id"))
    @Builder.Default
    private List<ExpertInvite> expertInvitations = new ArrayList<>();

    @Embeddable
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExpertInvite {
        private String email;
        private String role;
        private LocalDateTime invitedAt;
    }
}

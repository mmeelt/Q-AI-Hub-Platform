package tn.enicarthage.backend.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityNotFoundException;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.enicarthage.backend.entity.Event;
import tn.enicarthage.backend.entity.Phase;
import tn.enicarthage.backend.entity.Application;

import tn.enicarthage.backend.repository.ApplicationRepository;
import tn.enicarthage.backend.repository.EventRepository;
import tn.enicarthage.backend.repository.PhaseRepository;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.UUID;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class EventService {

    private final EventRepository eventRepository;
    private final PhaseRepository phaseRepository;
    private final ApplicationRepository applicationRepository;
    private final PhaseService phaseService;
    private final EventSubscriptionService eventSubscriptionService;

    @PersistenceContext
    private EntityManager entityManager;

    // ── CREATE ────────────────────────────────────────────────────

    @Transactional
    public Event createEvent(Event event) {
        // Generate eventId if not present
        if (event.getEventId() == null) {
            event.setEventId(UUID.randomUUID().toString());
        }
        if (event.getStatus() == null) {
            event.setStatus(Event.EventStatus.DRAFT);
        }
        if (event.getCurrentRegisteredCount() == null) {
            event.setCurrentRegisteredCount(0);
        }
        if (event.getEventType() == null) {
            event.setEventType(Event.EventType.SIMPLE);
        }
        if (event.getHasPitch() == null) {
            event.setHasPitch(false);
        }

        // Set invitedAt for experts
        if (event.getExpertInvitations() != null) {
            event.getExpertInvitations().forEach(expert -> {
                if (expert.getInvitedAt() == null) {
                    expert.setInvitedAt(LocalDateTime.now());
                }
            });
        }

        Event savedEvent = eventRepository.save(event);

        // Only create phases for INCUBATION events
        if (event.getEventType() == Event.EventType.INCUBATION) {
            List<Phase> phases = new ArrayList<>();

            phases.add(Phase.builder()
                    .phaseId(UUID.randomUUID().toString())
                    .eventId(savedEvent.getEventId())
                    .event(savedEvent)
                    .phaseName("Application Phase")
                    .phaseType(Phase.PhaseType.QUESTIONNAIRE)
                    .phaseOrder(1)
                    .phaseActive(false) // opened explicitly by the admin
                    .build());

            phases.add(Phase.builder()
                    .phaseId(UUID.randomUUID().toString())
                    .eventId(savedEvent.getEventId())
                    .event(savedEvent)
                    .phaseName("Technical Review")
                    .phaseType(Phase.PhaseType.QUESTIONNAIRE)
                    .phaseOrder(2)
                    .phaseActive(false)
                    .build());

            // Phase 3 only if hasPitch = true
            if (Boolean.TRUE.equals(event.getHasPitch())) {
                phases.add(Phase.builder()
                        .phaseId(UUID.randomUUID().toString())
                        .eventId(savedEvent.getEventId())
                        .event(savedEvent)
                        .phaseName("Pitch final")
                        .phaseType(Phase.PhaseType.PITCH)
                        .phaseOrder(3)
                        .phaseActive(false)
                        .build());
            }

            phaseRepository.saveAll(phases);
        }

        phaseRepository.flush();
        eventRepository.flush();
        entityManager.clear();

        return eventRepository.findById(savedEvent.getEventId()).get();
    }

    // ── READ ──────────────────────────────────────────────────────

    public Event getEventById(String eventId) {
        return eventRepository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Event not found with id: " + eventId));
    }

    public List<Event> getAllEvents() {
        return eventRepository.findAll();
    }

    public List<Event> getEventsByStatus(Event.EventStatus status) {
        return eventRepository.findByStatus(status);
    }

    public List<Event> getEventsByCategory(String category) {
        return eventRepository.findByCategory(category);
    }

    public List<Event> getEventsByType(Event.EventType eventType) {
        return eventRepository.findByEventType(eventType);
    }

    public List<Event> getOpenAndAvailableEvents() {
        return eventRepository.findOpenAndAvailableEvents();
    }

    // ── UPDATE ────────────────────────────────────────────────────

    @Transactional
    public Event updateEvent(String eventId, Event updatedEvent) {
        Event existing = getEventById(eventId);
        existing.setTitle(updatedEvent.getTitle());
        existing.setCategory(updatedEvent.getCategory());
        existing.setDescription(updatedEvent.getDescription());
        existing.setLocation(updatedEvent.getLocation());
        existing.setStartDate(updatedEvent.getStartDate());
        existing.setEndDate(updatedEvent.getEndDate());
        existing.setApplicationDeadline(updatedEvent.getApplicationDeadline());
        existing.setMaxParticipants(updatedEvent.getMaxParticipants());
        existing.setCoverImageUrl(updatedEvent.getCoverImageUrl());
        existing.setTags(updatedEvent.getTags());
        existing.setPartners(updatedEvent.getPartners());
        existing.setFormFieldsJson(updatedEvent.getFormFieldsJson());
        return eventRepository.save(existing);
    }

    @Transactional
    public Event activateEvent(String eventId) {
        Event event = getEventById(eventId);
        if (event.getStatus() != Event.EventStatus.DRAFT) {
            throw new IllegalStateException("Only DRAFT events can be activated");
        }
        event.setStatus(Event.EventStatus.ACTIVE);

        // Activate Phase 1 automatically only for INCUBATION
        if (event.getEventType() == Event.EventType.INCUBATION) {
            phaseRepository.findByEventIdAndPhaseOrder(eventId, 1)
                    .ifPresent(phase -> {
                        phase.setPhaseActive(true);
                        phaseRepository.save(phase);
                    });
        }

        Event saved = eventRepository.save(event);
        // "Notify me": tell everyone who was waiting for this event
        eventSubscriptionService.notifySubscribers(saved);
        return saved;
    }

    @Transactional
    public Event closeEvent(String eventId) {
        Event event = getEventById(eventId);
        if (event.getStatus() != Event.EventStatus.ACTIVE) {
            throw new IllegalStateException("Only ACTIVE events can be closed");
        }
        event.setStatus(Event.EventStatus.CLOSED);
        return eventRepository.save(event);
    }

    // ── PHASE ADVANCEMENT ─────────────────────────────────────────

    @Transactional
    public Phase advanceToNextPhase(String eventId) {
        getEventById(eventId);
        List<Phase> phases = phaseRepository.findByEventIdOrderByPhaseOrderAsc(eventId);
        int currentOrder = phases.stream()
                .filter(p -> Boolean.TRUE.equals(p.getPhaseActive()))
                .map(Phase::getPhaseOrder)
                .max(Integer::compareTo)
                .orElse(0);
        Phase nextPhase = phases.stream()
                .filter(p -> p.getPhaseOrder() == currentOrder + 1)
                .filter(p -> !Boolean.TRUE.equals(p.getPhaseLocked()))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("No next phase available for event: " + eventId));
        // Same rules and notifications as activating the phase directly
        return phaseService.activatePhase(nextPhase.getPhaseId());
    }

    // ── DELETE ────────────────────────────────────────────────────

    @Transactional
    public void deleteEvent(String eventId) {
        Event event = getEventById(eventId);
        eventRepository.delete(event);
    }

    // ── APPLICANTS ────────────────────────────────────────────────

    public List<Application> getEventApplicants(String eventId) {
        getEventById(eventId);
        return applicationRepository.findByTargetEventId(eventId);
    }

    // ── STATS ─────────────────────────────────────────────────────

    public Map<String, Object> getEventStats(String eventId) {
        Event event = getEventById(eventId);
        Map<String, Object> stats = event.generateEventStats();
        
        // Add application-specific stats
        List<Application> apps = applicationRepository.findByTargetEventId(eventId);
        stats.put("totalApplications", (long) apps.size());
        stats.put("acceptedCount", apps.stream().filter(a -> "ACCEPTED".equals(a.getApplicationStatus())).count());
        stats.put("pendingCount", apps.stream().filter(a -> "PENDING".equals(a.getApplicationStatus())).count());
        stats.put("rejectedCount", apps.stream().filter(a -> "REJECTED".equals(a.getApplicationStatus())).count());
        
        return stats;
    }

    public List<Event> getEventsByExpertEmail(String email) {
        return eventRepository.findByExpertEmail(email);
    }
}

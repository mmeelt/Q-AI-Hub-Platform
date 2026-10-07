package tn.enicarthage.backend.service;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.enicarthage.backend.entity.Event;
import tn.enicarthage.backend.entity.Phase;
import tn.enicarthage.backend.entity.PhaseSubmission;
import tn.enicarthage.backend.repository.ApplicationRepository;
import tn.enicarthage.backend.repository.EventRepository;
import tn.enicarthage.backend.repository.PhaseRepository;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class PhaseService {

    private final PhaseRepository phaseRepository;
    private final EventRepository eventRepository;
    private final ApplicationRepository applicationRepository;
    private final NotificationService notificationService;
    private final tn.enicarthage.backend.repository.PhaseSubmissionRepository phaseSubmissionRepository;

    // ── CREATE ────────────────────────────────────────────────────

    @Transactional
    public Phase createPhase(String eventId, Phase phase) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Event not found with id: " + eventId));

        phase.setEvent(event);

        if (phase.getPhaseActive() == null) {
            phase.setPhaseActive(false);
        }

        return phaseRepository.save(phase);
    }

    // ── READ ──────────────────────────────────────────────────────

    public Phase getPhaseById(String phaseId) {
        return phaseRepository.findById(phaseId)
                .orElseThrow(() -> new EntityNotFoundException("Phase not found with id: " + phaseId));
    }

    public List<Phase> getPhasesByEvent(String eventId) {
        // Keep historical data consistent: if a later phase is active, older phases must be locked.
        return reconcilePhaseProgress(eventId);
    }

    public Phase getActivePhase(String eventId) {
        reconcilePhaseProgress(eventId);
        return phaseRepository.findByEventIdAndPhaseActiveTrue(eventId)
                .orElseThrow(() -> new EntityNotFoundException("No active phase for event: " + eventId));
    }

    // ── UPDATE ────────────────────────────────────────────────────

    @Transactional
    public Phase updatePhase(String phaseId, Phase updatedPhase) {
        Phase existing = getPhaseById(phaseId);
        if (Boolean.TRUE.equals(existing.getPhaseLocked())) {
            throw new IllegalStateException("This phase is locked and can no longer be modified");
        }
        existing.setPhaseName(updatedPhase.getPhaseName());
        existing.setPhaseOrder(updatedPhase.getPhaseOrder());
        existing.setStartDate(updatedPhase.getStartDate());
        existing.setEndDate(updatedPhase.getEndDate());
        return phaseRepository.save(existing);
    }

    @Transactional
    public Phase updateFormFields(String phaseId, String formFieldsJson) {
        Phase phase = getPhaseById(phaseId);
        if (Boolean.TRUE.equals(phase.getPhaseLocked())) {
            throw new IllegalStateException("This phase is locked and questions can no longer be updated");
        }
        if (phase.getPhaseType() == Phase.PhaseType.PITCH) {
            throw new IllegalStateException("Pitch phases do not use form questions. Use rounds and criteria instead.");
        }
        phase.updateFormFields(formFieldsJson);
        return phaseRepository.save(phase);
    }

    @Transactional
    public Phase activatePhase(String phaseId) {
        Phase phase = getPhaseById(phaseId);
        if (Boolean.TRUE.equals(phase.getPhaseLocked())) {
            throw new IllegalStateException("This phase is locked forever and cannot be activated again");
        }

        // Phase 1 must have questions before participants can be invited to answer
        // (its own questions, or — for older events — the event's application questions).
        if (phase.getPhaseType() != Phase.PhaseType.PITCH && Integer.valueOf(1).equals(phase.getPhaseOrder())
                && !hasQuestions(phase.getFormFieldsJson())
                && !eventRepository.findById(phase.getEventId()).map(e -> hasQuestions(e.getFormFieldsJson())).orElse(false)) {
            throw new IllegalStateException("Add the Phase 1 questions (Edit Questions) before opening Phase 1");
        }

        // Deactivate all other phases; lock all earlier phases forever.
        String eventId = phase.getEventId();
        List<Phase> allPhases = reconcilePhaseProgress(eventId);

        // Never allow going backward: if any later phase is already active/locked, this phase is finished forever.
        boolean tryingToReopenFinishedPhase = allPhases.stream().anyMatch(p ->
                p.getPhaseOrder() > phase.getPhaseOrder()
                        && (Boolean.TRUE.equals(p.getPhaseActive()) || Boolean.TRUE.equals(p.getPhaseLocked())));
        if (tryingToReopenFinishedPhase) {
            throw new IllegalStateException("Cannot reactivate a previous phase after a later phase has started");
        }

        allPhases.forEach(p -> {
            p.setPhaseActive(false);
            if (p.getPhaseOrder() < phase.getPhaseOrder()) {
                p.setPhaseLocked(true);
            }
        });
        phaseRepository.saveAll(allPhases);

        // Activate this phase
        phase.activatePhase();
        Phase saved = phaseRepository.save(phase);

        // Opening a phase grants no acceptance. Notify only those who may take part:
        // Phase 1 → accepted applications; Phase N → participants accepted in Phase N-1.
        try {
            Phase previous = phase.getPhaseOrder() != null && phase.getPhaseOrder() > 1
                    ? allPhases.stream().filter(p -> p.getPhaseOrder() == phase.getPhaseOrder() - 1).findFirst().orElse(null)
                    : null;
            applicationRepository.findByTargetEventId(eventId).stream()
                .filter(app -> "ACCEPTED".equalsIgnoreCase(app.getApplicationStatus()))
                .filter(app -> previous == null || phaseSubmissionRepository
                        .findByPhaseIdAndSourceApplicationId(previous.getPhaseId(), app.getApplicationId())
                        .map(s -> s.getOutcome() == PhaseSubmission.DecisionStatus.ACCEPTED)
                        .orElse(false))
                .forEach(app -> notificationService.createNotification(
                    app.getApplicantUserId(),
                    phase.getPhaseName() + " is now open",
                    phase.getPhaseType() == Phase.PhaseType.PITCH
                        ? "Phase " + phase.getPhaseOrder() + " (" + phase.getPhaseName() + ") has started."
                        : "Phase " + phase.getPhaseOrder() + " is now open. You can submit your answers.",
                    "PHASE_ACTIVATED",
                    "/dashboard?tab=applications"
                ));
        } catch (Exception e) {
            log.error("Failed to notify applicants on phase activation: {}", e.getMessage());
        }

        return saved;
    }

    private boolean hasQuestions(String formFieldsJson) {
        if (formFieldsJson == null) return false;
        String trimmed = formFieldsJson.trim();
        return !trimmed.isEmpty() && !trimmed.equals("[]") && !trimmed.equals("null");
    }

    @Transactional
    public Phase deactivatePhase(String id) {
        Phase phase = getPhaseById(id);
        if (Boolean.TRUE.equals(phase.getPhaseLocked())) {
            throw new IllegalStateException("This phase is locked and cannot be deactivated");
        }
        phase.deactivatePhase();
        return phaseRepository.save(phase);
    }

    // ── DELETE ────────────────────────────────────────────────────

    @Transactional
    public void deletePhase(String id) {
        Phase phase = getPhaseById(id);
        phaseRepository.delete(phase);
    }

    // ── RESULTS ───────────────────────────────────────────────────

    public Map<String, Object> getPhaseResults(String id) {
        Phase phase = getPhaseById(id);
        return phase.calculatePhaseResults();
    }

    @Transactional
    protected List<Phase> reconcilePhaseProgress(String eventId) {
        List<Phase> phases = phaseRepository.findByEventIdOrderByPhaseOrderAsc(eventId);
        if (phases.isEmpty()) return phases;

        Integer highestActiveOrder = phases.stream()
                .filter(p -> Boolean.TRUE.equals(p.getPhaseActive()))
                .map(Phase::getPhaseOrder)
                .max(Integer::compareTo)
                .orElse(null);

        if (highestActiveOrder == null) return phases;

        boolean changed = false;
        for (Phase p : phases) {
            // Any phase before the active one is finished forever.
            if (p.getPhaseOrder() < highestActiveOrder) {
                if (!Boolean.TRUE.equals(p.getPhaseLocked())) {
                    p.setPhaseLocked(true);
                    changed = true;
                }
                if (Boolean.TRUE.equals(p.getPhaseActive())) {
                    p.setPhaseActive(false);
                    changed = true;
                }
            }
            // Ensure only one active phase remains.
            if (p.getPhaseOrder() > highestActiveOrder && Boolean.TRUE.equals(p.getPhaseActive())) {
                p.setPhaseActive(false);
                changed = true;
            }
        }

        if (changed) {
            phaseRepository.saveAll(phases);
        }
        return phases;
    }
}

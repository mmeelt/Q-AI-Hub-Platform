package tn.enicarthage.backend.service;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.enicarthage.backend.entity.Event;
import tn.enicarthage.backend.entity.EventRegistration;
import tn.enicarthage.backend.repository.EventRegistrationRepository;
import tn.enicarthage.backend.repository.EventRepository;
import tn.enicarthage.backend.security.InputSanitizer;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class EventRegistrationService {

    private final EventRegistrationRepository registrationRepository;
    private final EventRepository eventRepository;
    private final InputSanitizer inputSanitizer;
    private final EmailService emailService;
    private final PlatformSettingService platformSettings;

    /**
     * Registers a participant (guest or logged-in user) to a SIMPLE event.
     * No account and no startup are required: name + email + the event's own questions.
     */
    @Transactional
    /**
     * The admin's custom questions marked "required" must be answered (the page checks it too,
     * but the API must not accept a registration that skips it). Answers are keyed by the question
     * text (what the page sends), or by the question id / label.
     */
    static void checkRequiredAnswers(String formFieldsJson, String answersJson) {
        if (formFieldsJson == null || formFieldsJson.isBlank()) return;
        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        java.util.List<java.util.Map<String, Object>> fields;
        try {
            fields = mapper.readValue(formFieldsJson, new com.fasterxml.jackson.core.type.TypeReference<>() {});
        } catch (Exception e) {
            return; // malformed questions are the admin's problem, not the participant's
        }
        java.util.Map<String, Object> answers;
        try {
            answers = answersJson == null || answersJson.isBlank() ? java.util.Map.of()
                    : mapper.readValue(answersJson, new com.fasterxml.jackson.core.type.TypeReference<>() {});
        } catch (Exception e) {
            throw new IllegalArgumentException("Your answers could not be read. Please try again.");
        }
        for (java.util.Map<String, Object> f : fields) {
            if (!Boolean.TRUE.equals(f.get("required"))) continue;
            String label = String.valueOf(f.getOrDefault("question", f.getOrDefault("label", f.get("id"))));
            boolean answered = java.util.stream.Stream.of(f.get("question"), f.get("label"), f.get("id"))
                    .filter(java.util.Objects::nonNull)
                    .map(k -> answers.get(String.valueOf(k)))
                    .anyMatch(v -> v != null && !String.valueOf(v).isBlank()
                            && !(v instanceof java.util.Collection<?> c && c.isEmpty()));
            if (!answered) {
                throw new IllegalArgumentException("Please answer the required question: " + label);
            }
        }
    }

    public EventRegistration register(String eventId, String name, String email, String answersJson) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Event not found: " + eventId));

        if (event.getEventType() != Event.EventType.SIMPLE) {
            throw new IllegalStateException("Registration is only for SIMPLE events");
        }
        if (event.getStatus() != Event.EventStatus.ACTIVE) {
            throw new IllegalStateException(event.getStatus() == Event.EventStatus.DRAFT
                    ? "Registration is not open yet for this event"
                    : "Registration is closed for this event");
        }
        if (event.getApplicationDeadline() != null && LocalDate.now().isAfter(event.getApplicationDeadline())
                && !platformSettings.lateSubmissionsAllowed()) {
            throw new IllegalStateException("The registration deadline has passed");
        }

        String cleanName = inputSanitizer.sanitize(name == null ? "" : name.trim());
        if (cleanName == null || cleanName.isBlank()) {
            throw new IllegalArgumentException("Name is required");
        }
        String cleanEmail = inputSanitizer.sanitizeEmail(email == null ? "" : email);

        if (registrationRepository.existsByEventIdAndParticipantEmail(eventId, cleanEmail)) {
            throw new IllegalStateException("Already registered with email: " + cleanEmail);
        }
        if (event.isFull()) {
            throw new IllegalStateException("Event is already full");
        }
        checkRequiredAnswers(event.getFormFieldsJson(), answersJson);

        EventRegistration registration = EventRegistration.builder()
                .event(event)
                .participantName(cleanName)
                .participantEmail(cleanEmail)
                .answersJson(answersJson)
                .build();

        event.incrementRegistered();
        eventRepository.save(event);
        EventRegistration saved = registrationRepository.save(registration);

        try {
            emailService.sendEventRegistrationConfirmation(cleanEmail, cleanName, event);
        } catch (Exception e) {
            // Registration stays valid even if the confirmation email cannot be sent
            log.warn("Could not send registration confirmation to {}: {}", cleanEmail, e.getMessage());
        }
        return saved;
    }

    public List<EventRegistration> getRegistrationsByEvent(String eventId) {
        return registrationRepository.findByEventId(eventId);
    }

    public List<EventRegistration> getMyRegistrations(String email) {
        return registrationRepository.findByParticipantEmail(email);
    }

    @Transactional
    public void deleteRegistration(Long id) {
        EventRegistration registration = registrationRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Registration not found: " + id));
        Event event = registration.getEvent();
        registrationRepository.delete(registration);
        if (event != null && event.getCurrentRegisteredCount() != null && event.getCurrentRegisteredCount() > 0) {
            event.setCurrentRegisteredCount(event.getCurrentRegisteredCount() - 1);
            eventRepository.save(event);
        }
    }
}

package tn.enicarthage.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.enicarthage.backend.entity.Event;
import tn.enicarthage.backend.entity.EventSubscription;
import tn.enicarthage.backend.exception.ResourceNotFoundException;
import tn.enicarthage.backend.repository.EventRepository;
import tn.enicarthage.backend.repository.EventSubscriptionRepository;
import tn.enicarthage.backend.repository.UserRepository;
import tn.enicarthage.backend.security.InputSanitizer;

import java.time.LocalDateTime;
import java.util.List;

/**
 * "Notify me" on coming-soon (DRAFT) events. When the admin opens the event, every subscriber
 * gets one email (and logged-in users an in-app notification).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EventSubscriptionService {

    private final EventSubscriptionRepository subscriptionRepository;
    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final InputSanitizer inputSanitizer;
    private final EmailService emailService;
    private final NotificationService notificationService;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    /** Logged-in users are subscribed with their account email; guests must give an email. */
    @Transactional
    public void subscribe(String eventId, String guestEmail) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found"));
        if (event.getStatus() != Event.EventStatus.DRAFT) {
            throw new IllegalStateException(event.getStatus() == Event.EventStatus.ACTIVE
                    ? "This event is already open: you can register now"
                    : "This event is closed");
        }

        String userId = currentUserId();
        String email = userId != null
                ? userRepository.findById(userId).map(u -> u.getEmailAddress()).orElse(null)
                : null;
        if (email == null) {
            if (guestEmail == null || guestEmail.isBlank()) {
                throw new IllegalArgumentException("Please enter your email address");
            }
            email = inputSanitizer.sanitizeEmail(guestEmail);
            userId = null;
        }

        if (subscriptionRepository.findByEventIdAndEmailIgnoreCase(eventId, email).isPresent()) {
            return; // already subscribed: nothing to do
        }
        subscriptionRepository.save(EventSubscription.builder()
                .eventId(eventId)
                .email(email.toLowerCase())
                .userId(userId)
                .createdAt(LocalDateTime.now())
                .build());
    }

    @Transactional
    public void unsubscribe(String eventId) {
        String email = currentUserEmail();
        if (email == null) return;
        subscriptionRepository.findByEventIdAndEmailIgnoreCase(eventId, email)
                .ifPresent(subscriptionRepository::delete);
    }

    /** Event ids the logged-in user is waiting for. */
    public List<String> mySubscriptions() {
        String email = currentUserEmail();
        if (email == null) return List.of();
        return subscriptionRepository.findByEmailIgnoreCaseAndNotifiedAtIsNull(email).stream()
                .map(EventSubscription::getEventId).toList();
    }

    /** Called when an event opens: one email per subscriber, each notified once. */
    @Transactional
    public int notifySubscribers(Event event) {
        List<EventSubscription> pending = subscriptionRepository.findByEventIdAndNotifiedAtIsNull(event.getEventId());
        String base = frontendUrl.endsWith("/") ? frontendUrl.substring(0, frontendUrl.length() - 1) : frontendUrl;
        String link = event.getEventType() == Event.EventType.SIMPLE
                ? base + "/events/" + event.getEventId() + "/register"
                : base + "/events";
        for (EventSubscription s : pending) {
            emailService.sendEventOpened(s.getEmail(), event, link);
            if (s.getUserId() != null) {
                notificationService.createNotification(s.getUserId(), event.getTitle() + " is now open",
                        "The event you were waiting for is open. Register or apply now.", "EVENT_OPENED",
                        event.getEventType() == Event.EventType.SIMPLE ? "/events/" + event.getEventId() + "/register" : "/events");
            }
            s.setNotifiedAt(LocalDateTime.now());
        }
        subscriptionRepository.saveAll(pending);
        if (!pending.isEmpty()) {
            log.info("Event {} opened: {} subscriber(s) notified", event.getEventId(), pending.size());
        }
        return pending.size();
    }

    private String currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) return null;
        return userRepository.existsById(auth.getName()) ? auth.getName() : null;
    }

    private String currentUserEmail() {
        String userId = currentUserId();
        return userId == null ? null : userRepository.findById(userId).map(u -> u.getEmailAddress()).orElse(null);
    }
}

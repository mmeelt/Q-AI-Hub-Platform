package tn.enicarthage.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.enicarthage.backend.service.EventSubscriptionService;

import java.util.List;
import java.util.Map;

/** "Notify me" on coming-soon events (guests give an email, logged-in users use their account email). */
@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class EventSubscriptionController {

    private final EventSubscriptionService subscriptionService;

    record NotifyMeRequest(String email) {}

    // POST /api/events/{eventId}/notify-me  (public)
    @PostMapping("/{eventId}/notify-me")
    public ResponseEntity<Map<String, String>> notifyMe(@PathVariable String eventId,
                                                        @RequestBody(required = false) NotifyMeRequest body) {
        subscriptionService.subscribe(eventId, body == null ? null : body.email());
        return ResponseEntity.ok(Map.of("message", "You will receive an email when this event opens."));
    }

    // DELETE /api/events/{eventId}/notify-me  (logged-in users)
    @DeleteMapping("/{eventId}/notify-me")
    public ResponseEntity<Void> cancel(@PathVariable String eventId) {
        subscriptionService.unsubscribe(eventId);
        return ResponseEntity.noContent().build();
    }

    // GET /api/events/notify-me/mine  (logged-in users: events they are waiting for)
    @GetMapping("/notify-me/mine")
    public ResponseEntity<List<String>> mine() {
        return ResponseEntity.ok(subscriptionService.mySubscriptions());
    }
}

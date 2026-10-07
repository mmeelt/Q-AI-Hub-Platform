package tn.enicarthage.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.enicarthage.backend.entity.Event;
import tn.enicarthage.backend.entity.Phase;
import tn.enicarthage.backend.entity.Application;
import tn.enicarthage.backend.security.JwtUtil;
import tn.enicarthage.backend.service.EventService;
import org.springframework.security.access.prepost.PreAuthorize;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class EventController {

    private final EventService eventService;
    private final JwtUtil jwtUtil;
    private final tn.enicarthage.backend.service.JudgeAccessService judgeAccess;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    // ── Privacy: the expert (judge) list contains emails; only admins see it ──

    private boolean isAdmin() {
        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }

    /** Event as JSON, keeping only the invitations of {@code keepEmail} (none when null). */
    @SuppressWarnings("unchecked")
    private Map<String, Object> withoutExperts(Event event, String keepEmail) {
        Map<String, Object> json = objectMapper.convertValue(event, Map.class);
        List<Event.ExpertInvite> mine = keepEmail == null || event.getExpertInvitations() == null ? List.of()
                : event.getExpertInvitations().stream()
                        .filter(ei -> ei.getEmail() != null && ei.getEmail().equalsIgnoreCase(keepEmail))
                        .toList();
        json.put("expertInvitations", objectMapper.convertValue(mine, List.class));
        return json;
    }

    private ResponseEntity<?> publicView(Event event) {
        return ResponseEntity.ok(isAdmin() ? event : withoutExperts(event, null));
    }

    private ResponseEntity<?> publicView(List<Event> events) {
        if (isAdmin()) return ResponseEntity.ok(events);
        return ResponseEntity.ok(events.stream().map(e -> withoutExperts(e, null)).toList());
    }

    // POST /api/events
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<Event> createEvent(@RequestBody Event event) {
        return ResponseEntity.status(HttpStatus.CREATED).body(eventService.createEvent(event));
    }

    // GET /api/events
    @GetMapping
    public ResponseEntity<?> getAllEvents() {
        return publicView(eventService.getAllEvents());
    }

    // GET /api/events/open
    @GetMapping("/open")
    public ResponseEntity<?> getOpenEvents() {
        return publicView(eventService.getOpenAndAvailableEvents());
    }

    // BUG 2 FIX: extract email from the JWT token (not getName() which returns userId)
    @GetMapping("/expert-roles")
    public ResponseEntity<?> getMyExpertEvents() {
        // Works with the session cookie or a Bearer header (the JwtFilter authenticated the request)
        String email = judgeAccess.currentEmail();
        if (email == null) {
            return ResponseEntity.status(401).build();
        }
        // Each expert only sees their own invitation, not the other judges
        return ResponseEntity.ok(eventService.getEventsByExpertEmail(email).stream()
                .map(e -> withoutExperts(e, email)).toList());
    }

    // GET /api/events/{id}
    @GetMapping("/{id}")
    public ResponseEntity<?> getEventById(@PathVariable String id) {
        return publicView(eventService.getEventById(id));
    }

    // GET /api/events/status/{status}
    @GetMapping("/status/{status}")
    public ResponseEntity<?> getEventsByStatus(@PathVariable Event.EventStatus status) {
        return publicView(eventService.getEventsByStatus(status));
    }

    // GET /api/events/type/{type}
    @GetMapping("/type/{type}")
    public ResponseEntity<?> getEventsByType(@PathVariable Event.EventType type) {
        return publicView(eventService.getEventsByType(type));
    }

    // GET /api/events/category/{category}
    @GetMapping("/category/{category}")
    public ResponseEntity<?> getEventsByCategory(@PathVariable String category) {
        return publicView(eventService.getEventsByCategory(category));
    }


    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<Event> updateEvent(@PathVariable String id, @RequestBody Event event) {
        return ResponseEntity.ok(eventService.updateEvent(id, event));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}/activate")
    public ResponseEntity<Event> activateEvent(@PathVariable String id) {
        return ResponseEntity.ok(eventService.activateEvent(id));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}/close")
    public ResponseEntity<Event> closeEvent(@PathVariable String id) {
        return ResponseEntity.ok(eventService.closeEvent(id));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}/advance-phase")
    public ResponseEntity<Phase> advancePhase(@PathVariable String id) {
        return ResponseEntity.ok(eventService.advanceToNextPhase(id));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEvent(@PathVariable String id) {
        eventService.deleteEvent(id);
        return ResponseEntity.noContent().build();
    }

    // GET /api/events/{id}/applicants
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/{id}/applicants")
    public ResponseEntity<List<Application>> getEventApplicants(@PathVariable String id) {
        return ResponseEntity.ok(eventService.getEventApplicants(id));
    }

    // GET /api/events/{id}/stats
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/{id}/stats")
    public ResponseEntity<Map<String, Object>> getEventStats(@PathVariable String id) {
        return ResponseEntity.ok(eventService.getEventStats(id));
    }

}

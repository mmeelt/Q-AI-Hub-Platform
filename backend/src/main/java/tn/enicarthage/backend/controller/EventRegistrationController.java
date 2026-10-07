package tn.enicarthage.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.enicarthage.backend.entity.EventRegistration;
import tn.enicarthage.backend.service.EventRegistrationService;
import org.springframework.security.access.prepost.PreAuthorize;


import java.util.List;

@RestController
@RequestMapping("/api/registrations")
@RequiredArgsConstructor
public class EventRegistrationController {


    private final EventRegistrationService registrationService;
    private final tn.enicarthage.backend.repository.UserRepository userRepository;
    private final tn.enicarthage.backend.repository.AdminRepository adminRepository;

    // POST /api/registrations/event/{eventId}
    @PostMapping("/event/{eventId}")
    public ResponseEntity<EventRegistration> register(
            @PathVariable String eventId,
            @RequestBody RegisterRequest request) {
        // Public endpoint, but an authenticated admin must not register as a participant
        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            throw new org.springframework.security.access.AccessDeniedException("Administrators cannot register to events as participants");
        }
        EventRegistration registration = registrationService.register(
                eventId,
                request.participantName(),
                request.participantEmail(),
                request.answersJson()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(registration);
    }

    // GET /api/registrations/event/{eventId}
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/event/{eventId}")
    public ResponseEntity<List<tn.enicarthage.backend.dto.EventRegistrationResponse>> getRegistrations(@PathVariable String eventId) {
        List<tn.enicarthage.backend.entity.EventRegistration> regs = registrationService.getRegistrationsByEvent(eventId);
        return ResponseEntity.ok(regs.stream().map(this::mapToResponse).toList());
    }

    // GET /api/registrations/my
    @GetMapping("/my")
    public ResponseEntity<List<tn.enicarthage.backend.dto.EventRegistrationResponse>> getMyRegistrations() {
        String userId = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        
        // Try to get email from User or Admin
        String email = userRepository.findById(userId)
            .map(u -> u.getEmailAddress())
            .orElseGet(() -> adminRepository.findById(userId)
                .map(a -> a.getAdminEmail())
                .orElseThrow(() -> new tn.enicarthage.backend.exception.ResourceNotFoundException("User or Admin not found")));
        
        List<tn.enicarthage.backend.entity.EventRegistration> regs = registrationService.getMyRegistrations(email);
        return ResponseEntity.ok(regs.stream().map(this::mapToResponse).toList());
    }

    private tn.enicarthage.backend.dto.EventRegistrationResponse mapToResponse(tn.enicarthage.backend.entity.EventRegistration reg) {
        return tn.enicarthage.backend.dto.EventRegistrationResponse.builder()
            .id(reg.getId())
            .eventId(reg.getEvent().getEventId())
            .eventTitle(reg.getEvent().getTitle())
            .participantName(reg.getParticipantName())
            .participantEmail(reg.getParticipantEmail())
            .answersJson(reg.getAnswersJson())
            .registeredAt(reg.getRegisteredAt())
            .build();
    }


    // DELETE /api/registrations/{id}
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRegistration(@PathVariable Long id) {
        registrationService.deleteRegistration(id);
        return ResponseEntity.noContent().build();
    }


    record RegisterRequest(String participantName, String participantEmail, String answersJson) {}
}

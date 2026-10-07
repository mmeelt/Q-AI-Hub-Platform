package tn.enicarthage.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.enicarthage.backend.entity.Phase;
import tn.enicarthage.backend.service.PhaseService;
import org.springframework.security.access.prepost.PreAuthorize;


import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/phases")
@RequiredArgsConstructor
public class PhaseController {


    private final PhaseService phaseService;

    // POST /api/phases/event/{eventId}
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/event/{eventId}")
    public ResponseEntity<Phase> createPhase(

            @PathVariable String eventId,
            @RequestBody Phase phase) {
        Phase created = phaseService.createPhase(eventId, phase);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    // GET /api/phases/{id}
    @GetMapping("/{id}")
    public ResponseEntity<Phase> getPhaseById(@PathVariable String id) {
        return ResponseEntity.ok(phaseService.getPhaseById(id));
    }

    // GET /api/phases/event/{eventId}
    @GetMapping("/event/{eventId}")
    public ResponseEntity<List<Phase>> getPhasesByEvent(@PathVariable String eventId) {
        return ResponseEntity.ok(phaseService.getPhasesByEvent(eventId));
    }

    // GET /api/phases/event/{eventId}/active
    @GetMapping("/event/{eventId}/active")
    public ResponseEntity<Phase> getActivePhase(@PathVariable String eventId) {
        return ResponseEntity.ok(phaseService.getActivePhase(eventId));
    }

    // PUT /api/phases/{id}
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<Phase> updatePhase(

            @PathVariable String id,
            @RequestBody Phase phase) {
        return ResponseEntity.ok(phaseService.updatePhase(id, phase));
    }

    // PUT /api/phases/{id}/form-fields
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}/form-fields")
    public ResponseEntity<Phase> updateFormFields(
            @PathVariable String id,
            @RequestBody String formFieldsJson) {
        return ResponseEntity.ok(phaseService.updateFormFields(id, formFieldsJson));
    }

    // PUT /api/phases/{id}/activate
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}/activate")
    public ResponseEntity<Phase> activatePhase(@PathVariable String id) {
        return ResponseEntity.ok(phaseService.activatePhase(id));
    }

    // PUT /api/phases/{id}/deactivate
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}/deactivate")
    public ResponseEntity<Phase> deactivatePhase(@PathVariable String id) {
        return ResponseEntity.ok(phaseService.deactivatePhase(id));
    }

    // DELETE /api/phases/{id}
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePhase(@PathVariable String id) {

        phaseService.deletePhase(id);
        return ResponseEntity.noContent().build();
    }

    // GET /api/phases/{id}/results
    @PreAuthorize("hasAnyRole('ADMIN', 'JUDGE', 'EVALUATOR')")
    @GetMapping("/{id}/results")
    public ResponseEntity<Map<String, Object>> getPhaseResults(@PathVariable String id) {
        return ResponseEntity.ok(phaseService.getPhaseResults(id));
    }
}

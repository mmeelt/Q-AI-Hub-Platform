package tn.enicarthage.backend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.enicarthage.backend.entity.Pitch;
import tn.enicarthage.backend.service.PitchService;
import org.springframework.security.access.prepost.PreAuthorize;

import java.util.Date;

@RestController
@RequestMapping("/api/pitches")
public class PitchController {


    @Autowired
    private PitchService pitchService;

    // API 1: Create a new Pitch
    // POST http://localhost:8081/api/pitches/create
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/create")
    public ResponseEntity<Pitch> createPitch(@RequestBody Pitch pitch) {
        Pitch savedPitch = pitchService.createPitch(pitch);
        return ResponseEntity.ok(savedPitch);
    }

    // A small helper class just for receiving scheduling data
    static class ScheduleRequest {
        public Date date;
        public String venue;
    }

    // API 2: Schedule an existing Pitch
    // PUT http://localhost:8081/api/pitches/{pitchId}/schedule
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{pitchId}/schedule")
    public ResponseEntity<?> schedulePitch(@PathVariable String pitchId, @RequestBody ScheduleRequest request) {
        try {
            Pitch scheduledPitch = pitchService.schedulePitch(pitchId, request.date, request.venue);
            return ResponseEntity.ok(scheduledPitch);
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(e.getMessage());
        }
    }
}

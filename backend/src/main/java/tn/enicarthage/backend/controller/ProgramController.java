package tn.enicarthage.backend.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tn.enicarthage.backend.entity.Event;
import tn.enicarthage.backend.service.EventService;

import java.util.List;

@Tag(name = "Programs", description = "Incubation programs")
@RestController
@RequestMapping("/api/programs")
@RequiredArgsConstructor
public class ProgramController {

    private final EventService eventService;

    @GetMapping
    public ResponseEntity<List<Event>> getPrograms() {
        // Programs are essentially INCUBATION events in our system
        return ResponseEntity.ok(eventService.getEventsByType(Event.EventType.INCUBATION));
    }
}

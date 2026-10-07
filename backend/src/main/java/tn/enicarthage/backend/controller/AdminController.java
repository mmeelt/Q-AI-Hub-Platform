package tn.enicarthage.backend.controller;

import tn.enicarthage.backend.dto.AdminLoginRequest;
import tn.enicarthage.backend.dto.InviteExpertRequest;
import tn.enicarthage.backend.dto.ManageUserRequest;
import tn.enicarthage.backend.dto.PlatformSettingRequest;
import tn.enicarthage.backend.dto.StartupMetricsRequest;
import tn.enicarthage.backend.entity.Startup;
import tn.enicarthage.backend.entity.User;
import tn.enicarthage.backend.repository.EventRepository;
import tn.enicarthage.backend.repository.StartupRepository;
import tn.enicarthage.backend.repository.UserRepository;
import tn.enicarthage.backend.repository.ApplicationRepository;
import tn.enicarthage.backend.dto.StartupSummaryResponse;
import tn.enicarthage.backend.entity.Application;
import tn.enicarthage.backend.entity.Event;
import tn.enicarthage.backend.service.AdminService;
import tn.enicarthage.backend.service.StartupService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;


@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;
    private final StartupService startupService;
    private final UserRepository userRepository;
    private final StartupRepository startupRepository;
    private final EventRepository eventRepository;
    private final ApplicationRepository applicationRepository;

    @PostMapping("/login")
    public ResponseEntity<tn.enicarthage.backend.dto.LoginPendingResponse> login(@Valid @RequestBody AdminLoginRequest dto) {
        return ResponseEntity.ok(adminService.login(dto));
    }



    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/invite-expert")
    public ResponseEntity<Void> inviteExpert(@Valid @RequestBody InviteExpertRequest dto) {
        if (dto.getMessage() == null || dto.getMessage().isBlank()) {
            adminService.inviteExpert(dto.getEmail(), dto.getExpertRole(), dto.getEventId());
        } else {
            adminService.inviteExpert(dto.getEmail(), dto.getExpertRole(), dto.getEventId(), dto.getMessage());
        }
        return ResponseEntity.ok().build();
    }

    // POST /api/admin/invite-user — invite a participant (founder / team member) to create an account
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/invite-user")
    public ResponseEntity<Void> inviteUser(@Valid @RequestBody tn.enicarthage.backend.dto.InviteUserRequest dto) {
        adminService.inviteParticipant(dto.getEmail(), dto.getMessage());
        return ResponseEntity.ok().build();
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/users/{userId}/manage")
    public ResponseEntity<Void> manageUsers(@PathVariable String userId,
                                            @Valid @RequestBody ManageUserRequest dto) {
        adminService.manageUsers(dto.getAction(), userId);
        return ResponseEntity.ok().build();
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/platform")
    public ResponseEntity<Void> updatePlatformData(@Valid @RequestBody PlatformSettingRequest dto) {
        adminService.updatePlatformSettings(dto);
        return ResponseEntity.ok().build();
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/startups/{startupId}/metrics")
    public ResponseEntity<Startup> updateStartupMetrics(@PathVariable String startupId,
                                                                     @Valid @RequestBody StartupMetricsRequest dto) {
        String adminId = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication().getName();
        return ResponseEntity.ok(startupService.updateStartupMetrics(startupId, dto, adminId));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/users")
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/users/{userId}/applications")
    public ResponseEntity<List<Application>> getUserApplications(@PathVariable String userId) {
        return ResponseEntity.ok(applicationRepository.findByApplicantUserId(userId));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/startups")
    public ResponseEntity<List<StartupSummaryResponse>> getAllStartups() {
        List<Startup> startups = startupRepository.findAll();
        List<StartupSummaryResponse> summaries = startups.stream().map(s -> {
            List<Application> apps = applicationRepository.findByLinkedStartupId(s.getStartupId());
            List<String> eventTitles = apps.stream()
                .map(app -> eventRepository.findById(app.getTargetEventId())
                    .map(Event::getTitle)
                    .orElse("Unknown Event"))
                .distinct()
                .collect(java.util.stream.Collectors.toList());
            
            List<String> eventIds = apps.stream()
                .map(Application::getTargetEventId)
                .distinct()
                .collect(java.util.stream.Collectors.toList());

            String lastStatus = apps.isEmpty() ? "No Applications" : apps.get(apps.size() - 1).getApplicationStatus();
            String lastId = apps.isEmpty() ? null : apps.get(apps.size() - 1).getApplicationId();
            java.util.Date lastPitch = apps.isEmpty() ? null : apps.get(apps.size() - 1).getPitchDate();

            return StartupSummaryResponse.builder()
                .startup(s)
                .appliedEventTitles(eventTitles)
                .appliedEventIds(eventIds)
                .lastApplicationStatus(lastStatus)
                .lastApplicationId(lastId)
                .lastPitchDate(lastPitch)
                .build();
        }).collect(java.util.stream.Collectors.toList());
        
        return ResponseEntity.ok(summaries);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/events")
    public ResponseEntity<List<Event>> getAllEvents() {
        java.util.Map<String, Long> applications = applicationRepository.findAll().stream()
                .filter(a -> a.getTargetEventId() != null)
                .collect(java.util.stream.Collectors.groupingBy(
                        tn.enicarthage.backend.entity.Application::getTargetEventId, java.util.stream.Collectors.counting()));
        List<Event> events = eventRepository.findAll();
        events.forEach(e -> e.setParticipantCount(e.getEventType() == Event.EventType.SIMPLE
                ? (long) (e.getCurrentRegisteredCount() == null ? 0 : e.getCurrentRegisteredCount())
                : applications.getOrDefault(e.getEventId(), 0L)));
        return ResponseEntity.ok(events);
    }
}

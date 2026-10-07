package tn.enicarthage.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.enicarthage.backend.service.DashboardService;

import java.util.Map;

import org.springframework.security.access.prepost.PreAuthorize;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class DashboardController {

    private final DashboardService dashboardService;

    // GET /api/dashboard/stats
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getSystemStatistics() {
        return ResponseEntity.ok(dashboardService.getSystemStatistics());
    }

    // GET /api/dashboard/events/{eventId}
    @GetMapping("/events/{eventId}")
    public ResponseEntity<Map<String, Object>> getEventMetrics(@PathVariable String eventId) {
        return ResponseEntity.ok(dashboardService.getEventMetrics(eventId));
    }

    // GET /api/dashboard/startups
    @GetMapping("/startups")
    public ResponseEntity<Map<String, Object>> getStartupMetrics() {
        return ResponseEntity.ok(dashboardService.getStartupMetrics());
    }

    // GET /api/dashboard/export?format=json
    @GetMapping("/export")
    public ResponseEntity<Map<String, Object>> exportReport(
            @RequestParam(defaultValue = "json") String format) {
        return ResponseEntity.ok(dashboardService.exportReport(format));
    }

    // GET /api/dashboard/refresh
    @GetMapping("/refresh")
    public ResponseEntity<Map<String, Object>> refreshDashboard() {
        return ResponseEntity.ok(dashboardService.refreshDashboardData());
    }
}

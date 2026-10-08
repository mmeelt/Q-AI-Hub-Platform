package tn.enicarthage.backend.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tn.enicarthage.backend.service.ExportService;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;

/** "Data & Exports" (admin Settings): CSV downloads. */
@Tag(name = "Exports", description = "CSV exports (applications, jury scores, events)")
@RestController
@RequestMapping("/api/admin/exports")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class ExportController {

    private final ExportService exportService;

    @GetMapping("/applications.csv")
    public ResponseEntity<byte[]> applications() {
        return csv("qaihub-applications", exportService.applicationsCsv());
    }

    @GetMapping("/jury-scores.csv")
    public ResponseEntity<byte[]> juryScores() {
        return csv("qaihub-jury-scores", exportService.juryScoresCsv());
    }

    @GetMapping("/events.csv")
    public ResponseEntity<byte[]> events() {
        return csv("qaihub-events", exportService.eventsCsv());
    }

    private ResponseEntity<byte[]> csv(String name, String content) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(name + "-" + LocalDate.now() + ".csv").build().toString())
                // never cached: Spring Security already sends "Cache-Control: no-store" on every API response
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .body(content.getBytes(StandardCharsets.UTF_8));
    }
}

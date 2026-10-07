package tn.enicarthage.backend.controller;

import tn.enicarthage.backend.dto.FileUploadResponse;
import tn.enicarthage.backend.service.FileUploadService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileUploadController {

    private final FileUploadService fileUploadService;

    @PostMapping("/upload")
    public ResponseEntity<FileUploadResponse> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("subfolder") String subfolder) {
        String fileUrl = fileUploadService.uploadFile(file, subfolder);
        return ResponseEntity.ok(new FileUploadResponse(fileUrl));
    }
}

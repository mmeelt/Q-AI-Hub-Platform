package tn.enicarthage.backend.controller;

import tn.enicarthage.backend.dto.FileUploadResponse;
import tn.enicarthage.backend.service.FileUploadService;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import static org.junit.jupiter.api.Assertions.*;

class FileUploadControllerTest {

    private final FileUploadService fileUploadService = mock(FileUploadService.class);
    private final FileUploadController controller = new FileUploadController(fileUploadService);

    @Test
    void uploadFile_returnsFileUrl() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "logo.png",
                "image/png",
                "fake-image-bytes".getBytes()
        );

        when(fileUploadService.uploadFile(any(), eq("startups_logo")))
                .thenReturn("uploads/startups_logo/logo.png");

        FileUploadResponse response = controller.uploadFile(file, "startups_logo").getBody();

        assertNotNull(response);
        assertEquals("uploads/startups_logo/logo.png", response.getFileUrl());
        verify(fileUploadService).uploadFile(any(), eq("startups_logo"));
    }
}


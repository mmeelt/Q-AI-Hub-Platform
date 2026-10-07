package tn.enicarthage.backend.service;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.lang.reflect.Field;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

class FileUploadServiceTest {

    private static void setField(Object target, String fieldName, Object value) {
        try {
            Field f = target.getClass().getDeclaredField(fieldName);
            f.setAccessible(true);
            f.set(target, value);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @Test
    void uploadFile_rejectsTraversalSubfolder() throws IOException {
        Path tmp = Files.createTempDirectory("upload-test-");
        FileUploadService service = new FileUploadService();
        setField(service, "uploadDir", tmp.toString());

        MultipartFile file = new MockMultipartFile(
                "file",
                "logo.png",
                "image/png",
                "fake-image".getBytes()
        );

        assertThrows(RuntimeException.class, () -> service.uploadFile(file, "../etc"));
    }

    @Test
    void uploadFile_savesUnderUploadDir_returnsUrl() throws IOException {
        Path tmp = Files.createTempDirectory("upload-test-");
        FileUploadService service = new FileUploadService();
        setField(service, "uploadDir", tmp.toString());

        MultipartFile file = new MockMultipartFile(
                "file",
                "logo.png",
                "image/png",
                new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0x0D, 0x49, 0x48, 0x44, 0x52} // PNG signature + IHDR
        );

        String url = service.uploadFile(file, "startups_logo");

        assertNotNull(url);
        assertTrue(url.contains("/uploads/startups_logo/"));

        // Ensure a file exists under tmp/startups_logo
        Path subdir = tmp.resolve("startups_logo");
        assertTrue(Files.exists(subdir));
        try (var stream = Files.list(subdir)) {
            assertEquals(1, stream.count());
        }
    }

    // ── Pitch videos ──────────────────────────────────────────────

    private static final byte[] MP4 = {0, 0, 0, 0x20, 'f', 't', 'y', 'p', 'i', 's', 'o', 'm', 0, 0, 2, 0,
            'i', 's', 'o', 'm', 'i', 's', 'o', '2', 'a', 'v', 'c', '1', 'm', 'p', '4', '1'};
    private static final byte[] MOV = {0, 0, 0, 0x14, 'f', 't', 'y', 'p', 'q', 't', ' ', ' ', 0, 0, 0, 0, 'q', 't', ' ', ' '};
    private static final byte[] WEBM = {0x1A, 0x45, (byte) 0xDF, (byte) 0xA3, (byte) 0x9F, 0x42, (byte) 0x86, (byte) 0x81, 0x01,
            0x42, (byte) 0xF7, (byte) 0x81, 0x01, 0x42, (byte) 0xF2, (byte) 0x81, 0x04, 0x42, (byte) 0xF3, (byte) 0x81, 0x08,
            0x42, (byte) 0x82, (byte) 0x84, 'w', 'e', 'b', 'm'};

    private FileUploadService serviceIn(Path dir) {
        FileUploadService service = new FileUploadService();
        setField(service, "uploadDir", dir.toString());
        return service;
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.CsvSource({"pitch.mp4,MP4", "pitch.mov,MOV", "pitch.webm,WEBM"})
    void pitchVideo_supportedFormats_areStored(String name, String kind) throws IOException {
        byte[] bytes = switch (kind) { case "MP4" -> MP4; case "MOV" -> MOV; default -> WEBM; };
        Path tmp = Files.createTempDirectory("upload-test-");
        String url = serviceIn(tmp).uploadFile(new MockMultipartFile("file", name, "video/x", bytes), "pitch-videos");
        assertTrue(url.startsWith("/uploads/pitch-videos/"), url);
        assertTrue(Files.exists(tmp.resolve(url.substring("/uploads/".length()))));
    }

    @Test
    void pitchVideo_textFileRenamedToMp4_isRejected() throws IOException {
        Path tmp = Files.createTempDirectory("upload-test-");
        MultipartFile fake = new MockMultipartFile("file", "virus.mp4", "video/mp4", "not a video".getBytes());
        assertThrows(tn.enicarthage.backend.exception.FileUploadException.class,
                () -> serviceIn(tmp).uploadFile(fake, "pitch-videos"));
    }

    @Test
    void video_isOnlyAcceptedInThePitchVideoFolder() throws IOException {
        Path tmp = Files.createTempDirectory("upload-test-");
        MultipartFile video = new MockMultipartFile("file", "pitch.mp4", "video/mp4", MP4);
        assertThrows(tn.enicarthage.backend.exception.FileUploadException.class,
                () -> serviceIn(tmp).uploadFile(video, "logos"));
    }

    @Test
    void videoOver200Mb_isRejected() throws IOException {
        Path tmp = Files.createTempDirectory("upload-test-");
        MultipartFile big = org.mockito.Mockito.mock(MultipartFile.class);
        org.mockito.Mockito.when(big.isEmpty()).thenReturn(false);
        org.mockito.Mockito.when(big.getSize()).thenReturn(201L * 1024 * 1024);
        var ex = assertThrows(tn.enicarthage.backend.exception.FileUploadException.class,
                () -> serviceIn(tmp).uploadFile(big, "pitch-videos"));
        assertTrue(ex.getMessage().contains("200 MB"));
    }
}

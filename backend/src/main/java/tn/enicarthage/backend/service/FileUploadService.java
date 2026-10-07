package tn.enicarthage.backend.service;

import org.apache.tika.Tika;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import tn.enicarthage.backend.exception.FileUploadException;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Stores uploaded files under {file.upload-dir}/{subfolder}/{random-uuid}.{ext}.
 * The real content type is detected from the bytes (Tika), not trusted from the browser.
 *  - "pitch-videos": MP4, WebM or MOV videos, up to 200 MB
 *  - any other folder: JPG, PNG or PDF, up to 10 MB
 */
@Service
public class FileUploadService {

    @Value("${file.upload-dir}")
    private String uploadDir;

    public static final String VIDEO_FOLDER = "pitch-videos";
    private static final long MAX_DOCUMENT_SIZE = 10L * 1024 * 1024;   // 10 MB
    private static final long MAX_VIDEO_SIZE = 200L * 1024 * 1024;     // 200 MB

    // detected content type -> allowed file extensions
    private static final Map<String, Set<String>> DOCUMENT_TYPES = Map.of(
            "image/jpeg", Set.of("jpg", "jpeg"),
            "image/png", Set.of("png"),
            "application/pdf", Set.of("pdf"));
    // Tika (core) reports every ISO-BMFF file (MP4, MOV, M4V) as video/quicktime,
    // and WebM as its Matroska container type
    private static final Map<String, Set<String>> VIDEO_TYPES = Map.of(
            "video/quicktime", Set.of("mp4", "m4v", "mov"),
            "video/mp4", Set.of("mp4", "m4v"),
            "video/x-m4v", Set.of("m4v", "mp4"),
            "video/webm", Set.of("webm"),
            "video/x-matroska", Set.of("webm"),
            "application/x-matroska", Set.of("webm"));

    private static final Pattern SAFE_SUBFOLDER = Pattern.compile("^[A-Za-z0-9_-]{1,64}$");
    private final Tika tika = new Tika();

    public String uploadFile(MultipartFile file, String subfolder) {
        if (subfolder == null || !SAFE_SUBFOLDER.matcher(subfolder).matches()) {
            throw new FileUploadException("Invalid upload folder");
        }
        if (file == null || file.isEmpty()) {
            throw new FileUploadException("The file is empty");
        }

        boolean video = VIDEO_FOLDER.equals(subfolder);
        Map<String, Set<String>> allowed = video ? VIDEO_TYPES : DOCUMENT_TYPES;
        long maxSize = video ? MAX_VIDEO_SIZE : MAX_DOCUMENT_SIZE;
        if (file.getSize() > maxSize) {
            throw new FileUploadException("The file is too large (max " + (maxSize / 1024 / 1024) + " MB)");
        }

        String detectedType;
        try (InputStream in = file.getInputStream()) {
            detectedType = tika.detect(in); // from the bytes only: a renamed file cannot pass
        } catch (IOException e) {
            throw new FileUploadException("Could not read the file");
        }
        Set<String> extensions = allowed.get(detectedType);
        if (extensions == null) {
            throw new FileUploadException(video
                    ? "Unsupported video format. Please upload an MP4, WebM or MOV file."
                    : "Unsupported file type. Please upload a JPG, PNG or PDF file.");
        }

        String extension = extensionOf(file.getOriginalFilename());
        if (!extensions.contains(extension)) {
            throw new FileUploadException("The file extension does not match its content");
        }

        try {
            Path baseDir = Paths.get(uploadDir).toAbsolutePath().normalize();
            Path directory = baseDir.resolve(subfolder).normalize();
            if (!directory.startsWith(baseDir)) {
                throw new FileUploadException("Invalid upload folder");
            }
            Files.createDirectories(directory);
            String filename = UUID.randomUUID() + "." + extension;
            try (InputStream in = file.getInputStream()) {
                Files.copy(in, directory.resolve(filename));
            }
            return "/uploads/" + subfolder + "/" + filename;
        } catch (IOException e) {
            throw new FileUploadException("Could not store the file, please try again");
        }
    }

    private static String extensionOf(String filename) {
        if (filename == null) return "";
        String name = filename.replace('\\', '/');
        name = name.substring(name.lastIndexOf('/') + 1);
        int dot = name.lastIndexOf('.');
        return dot < 0 ? "" : name.substring(dot + 1).toLowerCase();
    }
}

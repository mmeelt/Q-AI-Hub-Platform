package tn.enicarthage.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import lombok.extern.slf4j.Slf4j;
import tn.enicarthage.backend.exception.AiUnavailableException;

import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Google Gemini client (startup description refinement, pitch feedback).
 * Fails with {@link AiUnavailableException}: callers decide what to show instead,
 * so an error message is never stored or displayed as if it were AI feedback.
 */
@Service
@Slf4j
public class GeminiService {

    private static final String API_URL = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent";

    private final RestTemplate restTemplate;
    private final String apiKey;
    private final String model;

    public GeminiService(RestTemplateBuilder builder,
                         @Value("${gemini.api.key:}") String apiKey,
                         @Value("${gemini.model:gemini-3-flash-preview}") String model,
                         @Value("${gemini.timeout-seconds:20}") long timeoutSeconds) {
        // A slow or unreachable AI service must not hold the request thread forever
        this.restTemplate = builder
                .connectTimeout(Duration.ofSeconds(5))
                .readTimeout(Duration.ofSeconds(timeoutSeconds))
                .build();
        this.apiKey = apiKey;
        this.model = model;
    }

    @SuppressWarnings("unchecked")
    public String getAiFeedback(String prompt) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new AiUnavailableException("GEMINI_API_KEY is not configured");
        }
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        // Key in a header, not in the URL: URLs end up in proxy and server logs
        headers.set("x-goog-api-key", apiKey);

        // Exact JSON structure Gemini expects: {"contents": [{"parts": [{"text": "prompt"}]}]}
        Map<String, Object> requestBody = Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))));

        try {
            Map<String, Object> response = restTemplate.postForObject(
                    String.format(API_URL, model), new HttpEntity<>(requestBody, headers), Map.class);

            List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
            Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
            List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
            String text = (String) parts.get(0).get("text");
            if (text == null || text.isBlank()) {
                throw new AiUnavailableException("Gemini returned an empty answer");
            }
            return text.trim();
        } catch (AiUnavailableException e) {
            throw e;
        } catch (Exception e) {
            // Details stay in the server log only
            log.error("Gemini API error: {}", e.getMessage());
            throw new AiUnavailableException("Gemini request failed", e);
        }
    }
}

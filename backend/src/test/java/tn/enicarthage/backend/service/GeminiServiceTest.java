package tn.enicarthage.backend.service;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.web.client.MockServerRestTemplateCustomizer;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.MediaType;
import tn.enicarthage.backend.exception.AiUnavailableException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class GeminiServiceTest {

    private static final String URL =
            "https://generativelanguage.googleapis.com/v1beta/models/test-model:generateContent";

    private final MockServerRestTemplateCustomizer server = new MockServerRestTemplateCustomizer();

    private GeminiService service(String apiKey) {
        return new GeminiService(new RestTemplateBuilder(server), apiKey, "test-model", 5);
    }

    @Test
    void returnsTheGeneratedText_andSendsTheKeyInAHeaderNotInTheUrl() {
        GeminiService gemini = service("secret-key");
        server.getServer().expect(requestTo(URL))               // no ?key=... in the URL
                .andExpect(header("x-goog-api-key", "secret-key"))
                .andExpect(jsonPath("$.contents[0].parts[0].text").value("Hello"))
                .andRespond(withSuccess("""
                        {"candidates":[{"content":{"parts":[{"text":"  Great pitch.  "}]}}]}""",
                        MediaType.APPLICATION_JSON));

        assertThat(gemini.getAiFeedback("Hello")).isEqualTo("Great pitch.");
        server.getServer().verify();
    }

    @Test
    void apiError_throwsInsteadOfReturningTheErrorAsFeedback() {
        GeminiService gemini = service("secret-key");
        server.getServer().expect(requestTo(URL)).andRespond(withServerError());

        assertThatThrownBy(() -> gemini.getAiFeedback("Hello")).isInstanceOf(AiUnavailableException.class);
    }

    @Test
    void emptyAnswer_isTreatedAsUnavailable() {
        GeminiService gemini = service("secret-key");
        server.getServer().expect(requestTo(URL)).andRespond(withSuccess(
                "{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\" \"}]}}]}", MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> gemini.getAiFeedback("Hello")).isInstanceOf(AiUnavailableException.class);
    }

    @Test
    void missingKey_failsWithoutCallingGemini() {
        GeminiService gemini = service("");
        server.getServer(); // no request expected

        assertThatThrownBy(() -> gemini.getAiFeedback("Hello"))
                .isInstanceOf(AiUnavailableException.class)
                .hasMessageContaining("GEMINI_API_KEY");
        server.getServer().verify();
    }
}

package tn.enicarthage.backend.security;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class RateLimitFilterTest {

    @Test
    void whenRequestExceedsLimit_thenReturns429() throws Exception {
        RateLimitFilter filter = new RateLimitFilter();

        String ip = "203.0.113.10";
        String path = "/api/users/profile"; // default bucket capacity = 60 per minute

        // 60 allowed requests
        for (int i = 0; i < 60; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest();
            request.setRequestURI(path);
            request.setRemoteAddr(ip);
            request.addHeader("X-Forwarded-For", ip);

            MockHttpServletResponse response = new MockHttpServletResponse();
            FilterChain chain = mock(FilterChain.class);

            filter.doFilter(request, response, chain);

            assertNotEquals(429, response.getStatus(), "Should not be rate-limited before capacity is exceeded");
            verify(chain, times(1)).doFilter(request, response);
        }

        // 61st request should be blocked
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI(path);
        request.setRemoteAddr(ip);
        request.addHeader("X-Forwarded-For", ip);

        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(request, response, chain);

        assertEquals(429, response.getStatus());
        assertTrue(response.getContentAsString().contains("Too many requests"));
        verify(chain, never()).doFilter(request, response);
    }
}


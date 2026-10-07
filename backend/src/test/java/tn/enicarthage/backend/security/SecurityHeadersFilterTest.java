package tn.enicarthage.backend.security;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class SecurityHeadersFilterTest {

    @Test
    void setsSecurityHeaders() throws Exception {
        SecurityHeadersFilter filter = new SecurityHeadersFilter();

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/auth/login");

        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(request, response, chain);

        assertEquals("nosniff", response.getHeader("X-Content-Type-Options"));
        assertEquals("DENY", response.getHeader("X-Frame-Options"));
        assertNotNull(response.getHeader("Referrer-Policy"));
        assertNotNull(response.getHeader("Permissions-Policy"));

        verify(chain, times(1)).doFilter(request, response);
    }
}


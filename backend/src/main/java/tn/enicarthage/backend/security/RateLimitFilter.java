package tn.enicarthage.backend.security;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private final Cache<String, Bucket> cache = Caffeine.newBuilder()
            .maximumSize(50000)
            .expireAfterAccess(Duration.ofHours(1))
            .build();

    private Bucket resolveBucket(String ip, String path) {
        return cache.get(ip + "-" + path, k -> createNewBucket(path));
    }

    private Bucket createNewBucket(String path) {
        long capacity = 60;
        Duration duration = Duration.ofMinutes(1);

        if (path.equals("/api/auth/login") || path.equals("/api/admin/login")) {
            capacity = 5;
        } else if (path.equals("/api/auth/register")) {
            capacity = 3;
        } else if (path.equals("/api/auth/verify-otp") || path.equals("/api/admin/verify-otp")) {
            capacity = 5;
            duration = Duration.ofMinutes(15);
        } else if (path.equals("/api/auth/resend-otp")) {
            capacity = 3;
            duration = Duration.ofMinutes(5);
        } else if (path.equals("/api/auth/forgot-password")) {
            // each request sends an email
            capacity = 3;
            duration = Duration.ofMinutes(15);
        } else if (path.equals("/api/auth/reset-password")) {
            capacity = 5;
            duration = Duration.ofMinutes(15);
        } else if (path.startsWith("/api/events/") && path.endsWith("/notify-me")) {
            capacity = 10;
        } else if (path.startsWith("/api/registrations/event/")) {
            // Public guest registration to simple events
            capacity = 10;
        } else if (path.equals("/api/startups/refine-description")) {
            // Public (landing page demo) and backed by a paid AI API
            capacity = 5;
        }

        Bandwidth limit = Bandwidth.builder()
                .capacity(capacity)
                .refillGreedy(capacity, duration)
                .build();
        return Bucket.builder().addLimit(limit).build();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod()) || !request.getRequestURI().startsWith("/api/")) {
            filterChain.doFilter(request, response);
            return;
        }

        String ip = request.getRemoteAddr();
        String path = request.getRequestURI();
        Bucket bucket = resolveBucket(ip, path);

        if (bucket.tryConsume(1)) {
            filterChain.doFilter(request, response);
        } else {
            response.setStatus(429);
            response.setHeader("Retry-After", "60");
            response.setContentType("application/json");
            response.getWriter().write("{\"error\": \"Too many requests. Please wait a moment and try again.\", \"status\": 429}");
        }
    }
}

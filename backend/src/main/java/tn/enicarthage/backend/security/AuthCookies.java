package tn.enicarthage.backend.security;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Session tokens travel in HttpOnly cookies, so page scripts (and any injected script) cannot read them.
 * SameSite=Strict keeps the browser from sending them on cross-site requests (CSRF protection).
 *  - access token:  sent to every /api call
 *  - refresh token: only sent to /api/auth (refresh + logout)
 * "Remember me": persistent cookies (kept after the browser is closed). Otherwise session cookies,
 * deleted when the browser closes. A small marker cookie remembers the choice for session renewals.
 */
@Component
public class AuthCookies {

    public static final String ACCESS = "qa_access";
    public static final String REFRESH = "qa_refresh";
    /** Present (value "1") when the user ticked "Remember me". Sent only to /api/auth. */
    public static final String REMEMBER = "qa_remember";

    @Value("${app.cookies.secure:true}")
    private boolean secure;

    @Value("${jwt.expiration}")
    private long accessTtlMs;

    @Value("${jwt.refresh.expiration}")
    private long refreshTtlMs;

    /** All the Set-Cookie headers for a session. */
    public String[] session(String accessToken, String refreshToken, boolean persistent) {
        Duration access = persistent ? Duration.ofMillis(accessTtlMs) : null;
        Duration refresh = persistent ? Duration.ofMillis(refreshTtlMs) : null;
        return new String[] {
                build(ACCESS, accessToken, "/api", access),
                build(REFRESH, refreshToken, "/api/auth", refresh),
                persistent ? build(REMEMBER, "1", "/api/auth", refresh) : build(REMEMBER, "", "/api/auth", Duration.ZERO),
        };
    }

    public String accessCookie(String token) {
        return build(ACCESS, token, "/api", Duration.ofMillis(accessTtlMs));
    }

    public String refreshCookie(String token) {
        return build(REFRESH, token, "/api/auth", Duration.ofMillis(refreshTtlMs));
    }

    public String[] clearAll() {
        return new String[] {
                build(ACCESS, "", "/api", Duration.ZERO),
                build(REFRESH, "", "/api/auth", Duration.ZERO),
                build(REMEMBER, "", "/api/auth", Duration.ZERO),
        };
    }

    /** True when the current session was opened with "Remember me" (marker cookie present). */
    public static boolean remembered(HttpServletRequest request) {
        return "1".equals(read(request, REMEMBER));
    }

    public static String read(HttpServletRequest request, String name) {
        if (request.getCookies() == null) return null;
        for (Cookie c : request.getCookies()) {
            if (name.equals(c.getName()) && c.getValue() != null && !c.getValue().isBlank()) {
                return c.getValue();
            }
        }
        return null;
    }

    /** maxAge null = session cookie (deleted when the browser closes). */
    private String build(String name, String value, String path, Duration maxAge) {
        ResponseCookie.ResponseCookieBuilder b = ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(secure)
                .sameSite("Strict")
                .path(path);
        if (maxAge != null) b.maxAge(maxAge);
        return b.build().toString();
    }

    public static final String SET_COOKIE = HttpHeaders.SET_COOKIE;
}

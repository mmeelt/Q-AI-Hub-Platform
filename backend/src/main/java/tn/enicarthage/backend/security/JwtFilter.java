package tn.enicarthage.backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
public class JwtFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;

    // Admin tokens are re-checked against the admins table, so removing an admin takes effect
    // immediately instead of when the token expires (admins are few: one cheap lookup).
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private tn.enicarthage.backend.repository.AdminRepository adminRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");
        final String jwt;
        final String userId;

        // Browser sessions use the HttpOnly cookie; API clients may still send a Bearer header
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            jwt = authHeader.substring(7);
        } else {
            jwt = AuthCookies.read(request, AuthCookies.ACCESS);
        }
        if (jwt == null) {
            filterChain.doFilter(request, response);
            return;
        }
        if (jwtUtil.validateToken(jwt) && jwtUtil.validateTokenClaims(jwt)) {
            userId = jwtUtil.extractUserId(jwt);
            String role = jwtUtil.extractRole(jwt);
            // Map JWT "role" into Spring Security authorities.
            // Spring's hasRole("ADMIN") expects authorities formatted as "ROLE_ADMIN".
            List<GrantedAuthority> authorities = new ArrayList<>();
            if (role != null && !role.isBlank()) {
                String normalizedRole = role.startsWith("ROLE_") ? role.substring(5) : role;
                authorities.add(new SimpleGrantedAuthority("ROLE_" + normalizedRole));
                authorities.add(new SimpleGrantedAuthority(normalizedRole));
            }
            boolean removedAdmin = role != null && role.replaceFirst("^ROLE_", "").equals("ADMIN")
                    && adminRepository != null && userId != null && !adminRepository.existsById(userId);
            if (userId != null && !removedAdmin && SecurityContextHolder.getContext().getAuthentication() == null) {
                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                        userId, null, authorities);
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        }

        filterChain.doFilter(request, response);
    }
}

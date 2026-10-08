package tn.enicarthage.backend.config;

import tn.enicarthage.backend.security.JwtFilter;
import tn.enicarthage.backend.security.RateLimitFilter;
import tn.enicarthage.backend.security.SecurityHeadersFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final SecurityHeadersFilter securityHeadersFilter;
    private final RateLimitFilter rateLimitFilter;
    private final JwtFilter jwtFilter;

    // Comma-separated origins or patterns (e.g. https://qaihub.tn or http://localhost:*)
    @org.springframework.beans.factory.annotation.Value("${app.cors.allowed-origins}")
    private String allowedOrigins;

    public SecurityConfig(SecurityHeadersFilter securityHeadersFilter, RateLimitFilter rateLimitFilter, JwtFilter jwtFilter) {
        this.securityHeadersFilter = securityHeadersFilter;
        this.rateLimitFilter = rateLimitFilter;
        this.jwtFilter = jwtFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // No/expired session -> 401 (not 403), so the frontend knows to refresh the session cookie
                .exceptionHandling(ex -> ex.authenticationEntryPoint(
                        new org.springframework.security.web.authentication.HttpStatusEntryPoint(
                                org.springframework.http.HttpStatus.UNAUTHORIZED)))
                .headers(headers -> headers
                        .frameOptions(frame -> frame.deny())
                        .xssProtection(xss -> xss.disable())
                        .contentTypeOptions(Customizer.withDefaults())
                        .httpStrictTransportSecurity(hsts -> hsts.includeSubDomains(true).maxAgeInSeconds(31536000)))
                .authorizeHttpRequests(auth -> auth
                        // Internal error forwards (e.g. a 403 rendered by /error) must keep their status
                        .dispatcherTypeMatchers(jakarta.servlet.DispatcherType.ERROR, jakarta.servlet.DispatcherType.FORWARD).permitAll()
                        // API docs: only served when springdoc is enabled (dev profile or API_DOCS_ENABLED=true)
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/v3/api-docs/**", "/swagger-ui.html", "/swagger-ui/**").permitAll()
                        .requestMatchers("/api/auth/change-password").authenticated()
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/api/admin/login", "/api/admin/verify-otp").permitAll()
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/registrations/**").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/applications/track/**").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/events", "/api/events/**").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/startups/refine-description").permitAll()
                        // Uploaded logos / pitch decks (random UUID file names), loaded by <img>/<a> without a token
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/uploads/**").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/public/**").permitAll()
                        // "Notify me" works for guests too (they give an email)
                        .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/events/*/notify-me").permitAll()
                        .anyRequest().authenticated())

                .addFilterBefore(securityHeadersFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(rateLimitFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        // From app.cors.allowed-origins: localhost:* in dev, the real site URL in production
        config.setAllowedOriginPatterns(java.util.Arrays.stream(allowedOrigins.split(","))
                .map(String::trim).filter(o -> !o.isEmpty()).toList());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Requested-With"));
        config.setExposedHeaders(List.of("Authorization"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    /**
     * Define a dummy UserDetailsService to prevent Spring Boot from generating a default security password.
     * Since this application uses custom JWT-based authentication in AuthService and JwtFilter,
     * the standard UserDetailsService is not used for authentication.
     */
    @Bean
    public UserDetailsService userDetailsService() {
        return username -> {
            throw new UsernameNotFoundException("Standard UserDetailsService not supported. Use JWT authentication.");
        };
    }
}

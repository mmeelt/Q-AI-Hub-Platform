package tn.enicarthage.backend.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;
import java.util.UUID;
import java.util.function.Function;

@Component
@RequiredArgsConstructor
public class JwtUtil {

    private final JtiBlacklist jtiBlacklist;

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration}")
    private Long expiration;

    @Value("${jwt.issuer:platform-backend}")
    private String issuer;

    @jakarta.annotation.PostConstruct
    void checkSecret() {
        // HS512 needs at least 64 bytes; fail fast instead of signing with a weak key
        if (secret == null || secret.getBytes().length < 64) {
            throw new IllegalStateException("JWT_SECRET must be set and at least 64 characters long");
        }
    }

    public Key getSigningKey() {
        return Keys.hmacShaKeyFor(secret.getBytes());
    }

    public String generateToken(String userId, String email, String role) {
        return Jwts.builder()
                .setSubject(userId)
                .claim("email", email)
                .claim("role", role)
                .setId(UUID.randomUUID().toString()) // jti
                .setIssuer(issuer) // iss
                .setIssuedAt(new Date()) // iat
                .setExpiration(new Date(System.currentTimeMillis() + expiration)) // exp
                .signWith(getSigningKey(), SignatureAlgorithm.HS512)
                .compact();
    }

    public Boolean validateToken(String token) {
        try {
            Jwts.parserBuilder().setSigningKey(getSigningKey()).build().parseClaimsJws(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public Boolean validateTokenClaims(String token) {
        try {
            Claims claims = extractAllClaims(token);
            if (!issuer.equals(claims.getIssuer())) return false;
            if (jtiBlacklist.isBlacklisted(claims.getId())) return false;
            if (claims.getExpiration().before(new Date())) return false;
            if (claims.getSubject() == null) return false;
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public String extractUserId(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public String extractEmail(String token) {
        return extractAllClaims(token).get("email", String.class);
    }

    public String extractRole(String token) {
        return extractAllClaims(token).get("role", String.class);
    }

    public String extractJti(String token) {
        return extractClaim(token, Claims::getId);
    }

    public String extractIssuer(String token) {
        return extractClaim(token, Claims::getIssuer);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    public Claims extractAllClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}

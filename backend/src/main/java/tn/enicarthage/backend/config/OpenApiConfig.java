package tn.enicarthage.backend.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tn.enicarthage.backend.security.AuthCookies;

/**
 * OpenAPI description served at /v3/api-docs and rendered by Swagger UI at /swagger-ui.html
 * (enabled by the dev profile only).
 */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI qaiHubOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Q-AI Hub API")
                        .version("1.0")
                        .description("""
                                REST API of the Q-AI Hub incubator platform: events and registrations, \
                                incubation programs (phases), multi-judge pitch evaluation and startups.

                                **Authentication**: log in with `POST /api/auth/login`, then confirm the emailed \
                                code with `POST /api/auth/verify-otp`. The session is kept in an HttpOnly cookie \
                                (`%s`), so requests made from this page are authenticated automatically \
                                once you are logged in.""".formatted(AuthCookies.ACCESS))
                        .license(new License().name("MIT").url("https://opensource.org/licenses/MIT")))
                .components(new Components().addSecuritySchemes("sessionCookie", new SecurityScheme()
                        .type(SecurityScheme.Type.APIKEY)
                        .in(SecurityScheme.In.COOKIE)
                        .name(AuthCookies.ACCESS)))
                .addSecurityItem(new SecurityRequirement().addList("sessionCookie"));
    }
}

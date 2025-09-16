package com.soyanga.soyangabackend.configuracion;

import com.soyanga.soyangabackend.seguridad.jwt.JwtAuthFilter;
import com.soyanga.soyangabackend.servicio.seguridad.UsuarioDetallesService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.*;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtFilter;
    private final UsuarioDetallesService uds;
    private final AuthenticationProvider authenticationProvider;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(c -> {})
                .csrf(csrf -> csrf.disable())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authenticationProvider(authenticationProvider)
                .userDetailsService(uds)
//                .authorizeHttpRequests(reg -> reg
//                        .requestMatchers("/api/v1/auth/**").permitAll() // solo login/registro sin token
//                        .requestMatchers(HttpMethod.GET, "/api/v1/catalogo/**").permitAll() // solo GET sin token
//                        .anyRequest().authenticated() // todo lo demás necesita autenticación
//                )
                .authorizeHttpRequests(reg -> reg
                        .requestMatchers("/**").permitAll() // permite cualquier ruta y método
                )
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}

package org.assistant.config;

import org.assistant.entity.User;
import org.assistant.service.JwtService;
import org.assistant.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Collections;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserService userService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, 
                                  FilterChain filterChain) throws ServletException, IOException {
        
        String authHeader = request.getHeader("Authorization");
        
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            
            try {
                logger.debug("Validating JWT token: {}", token.substring(0, Math.min(20, token.length())) + "...");
                if (jwtService.validateToken(token)) {
                    String email = jwtService.extractEmail(token);
                    Long userId = jwtService.extractUserId(token);
                    
                    logger.debug("JWT token valid, extracting user: email={}, userId={}", email, userId);
                    User user = userService.findById(userId);
                    if (user != null && user.getEmail().equals(email)) {
                        logger.debug("User found and email matches, setting authentication for: {}", email);
                        // Create authentication object
                        Authentication authentication = new UsernamePasswordAuthenticationToken(
                            user, 
                            null, 
                            Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER"))
                        );
                        
                        SecurityContextHolder.getContext().setAuthentication(authentication);
                    } else {
                        logger.warn("User not found or email mismatch: user={}, email={}", user != null ? user.getEmail() : "null", email);
                    }
                } else {
                    logger.debug("JWT token validation failed");
                }
            } catch (Exception e) {
                // Token is invalid, continue without authentication
                logger.debug("JWT token validation failed: " + e.getMessage(), e);
            }
        } else {
            logger.debug("No valid Authorization header found");
        }
        
        filterChain.doFilter(request, response);
    }
}

// src/main/java/org/assistant/config/OAuth2SuccessHandler.java
package org.assistant.config;

import org.assistant.entity.User;
import org.assistant.service.JwtService;
import org.assistant.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;

@Component
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

    @Autowired
    private UserService userService;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private FrontendProperties frontendProperties;  // Inject the properties

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {

        try {
            OAuth2User oauth2User = (OAuth2User) authentication.getPrincipal();

            String googleId = oauth2User.getName();
            String email = oauth2User.getAttribute("email");
            String name = oauth2User.getAttribute("name");
            String picture = oauth2User.getAttribute("picture");

            System.out.println("OAuth2 Success - Google ID: " + googleId);
            System.out.println("OAuth2 Success - Email: " + email);
            System.out.println("OAuth2 Success - Name: " + name);

            // Create or update user
            User user = new User(googleId, email, name, picture);
            User savedUser = userService.saveOrUpdateUser(user);

            System.out.println("User saved/updated with ID: " + savedUser.getId());

            // Generate JWT token
            String token = jwtService.generateToken(email, savedUser.getId());

            // Use frontend URL from properties
            String frontendUrl = frontendProperties.getUrl();
            // Remove trailing slash to avoid double slashes
            if (frontendUrl.endsWith("/")) {
                frontendUrl = frontendUrl.substring(0, frontendUrl.length() - 1);
            }
            String redirectUrl = frontendUrl + "/auth/success?token=" + token;
            response.sendRedirect(redirectUrl);

        } catch (Exception e) {
            System.err.println("Error in OAuth2 success handler: " + e.getMessage());
            e.printStackTrace();
            String frontendUrl = frontendProperties.getUrl();
            // Remove trailing slash to avoid double slashes
            if (frontendUrl.endsWith("/")) {
                frontendUrl = frontendUrl.substring(0, frontendUrl.length() - 1);
            }
            String redirectUrl = frontendUrl + "/auth/failure?error=" + e.getMessage();
            response.sendRedirect(redirectUrl);
        }
    }
}
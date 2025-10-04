package org.assistant.controller;

import org.assistant.config.FrontendProperties;
import org.assistant.entity.User;
import org.assistant.service.JwtService;
import org.assistant.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    
    @Autowired
    private UserService userService;
    
    @Autowired
    private JwtService jwtService;
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    @Autowired
    private FrontendProperties frontendProperties;
    
    @GetMapping("/success")
    public ResponseEntity<Map<String, Object>> loginSuccess(Authentication authentication) {
        try {
            OAuth2User oauth2User = (OAuth2User) authentication.getPrincipal();
            
            String googleId = oauth2User.getName(); // This will be 'sub' from Google OAuth
            String email = oauth2User.getAttribute("email");
            String name = oauth2User.getAttribute("name");
            String picture = oauth2User.getAttribute("picture");
            
            // Create or update user
            User user = new User(googleId, email, name, picture);
            User savedUser = userService.saveOrUpdateUser(user);
            
            // Generate JWT token
            String token = jwtService.generateToken(email, savedUser.getId());
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("token", token);
            response.put("user", createUserResponse(savedUser));
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Authentication failed: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }
    
    @GetMapping("/failure")
    public ResponseEntity<Map<String, Object>> loginFailure() {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", "Authentication failed");
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
    }
    
    @GetMapping("/user")
    public ResponseEntity<Map<String, Object>> getCurrentUser(@RequestHeader("Authorization") String authHeader) {
        try {
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Invalid token format");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
            
            String token = authHeader.substring(7);
            
            if (jwtService.validateToken(token)) {
                String email = jwtService.extractEmail(token);
                Long userId = jwtService.extractUserId(token);
                
                User user = userService.findById(userId);
                if (user == null) {
                    Map<String, Object> response = new HashMap<>();
                    response.put("success", false);
                    response.put("message", "User not found");
                    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
                }
                
                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("user", createUserResponse(user));
                
                return ResponseEntity.ok(response);
            } else {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Invalid or expired token");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
            
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Error retrieving user: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    @GetMapping("/validate")
    public ResponseEntity<Map<String, Object>> validateToken(@RequestHeader("Authorization") String authHeader) {
        try {
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Invalid token format");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
            
            String token = authHeader.substring(7);
            
            if (jwtService.validateToken(token)) {
                String email = jwtService.extractEmail(token);
                Long userId = jwtService.extractUserId(token);
                
                User user = userService.findById(userId);
                
                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("user", createUserResponse(user));
                
                return ResponseEntity.ok(response);
            } else {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Invalid or expired token");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
            
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Token validation failed: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    @PostMapping("/logout")
    public ResponseEntity<Map<String, Object>> logout(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Extract and invalidate the JWT token
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                
                // Validate token before invalidating
                if (jwtService.validateToken(token)) {
                    Long userId = jwtService.extractUserId(token);
                    
                    // Invalidate the token
                    jwtService.invalidateToken(token);
                    
                    // Optionally invalidate all user tokens (for security)
                    // jwtService.invalidateAllUserTokens(userId);
                    
                    response.put("success", true);
                    response.put("message", "Logged out successfully - token invalidated");
                } else {
                    response.put("success", true);
                    response.put("message", "Logged out successfully - token was already invalid");
                }
            } else {
                response.put("success", true);
                response.put("message", "Logged out successfully");
            }
            
        } catch (Exception e) {
            response.put("success", true);
            response.put("message", "Logged out successfully");
            // Don't fail logout even if token invalidation fails
            System.out.println("Logout token invalidation error: " + e.getMessage());
        }
        
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@Valid @RequestBody RegisterRequest registerRequest) {
        try {
            // Check if user already exists
            User existingUser = userService.findByEmail(registerRequest.getEmail());
            if (existingUser != null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "User with this email already exists");
                return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
            }
            
            // Create new user
            User user = new User();
            user.setEmail(registerRequest.getEmail());
            user.setName(registerRequest.getName());
            user.setPassword(passwordEncoder.encode(registerRequest.getPassword()));
            user.setIsActive(true);
            user.setCreatedAt(LocalDateTime.now());
            user.setLastLogin(LocalDateTime.now());
            
            User savedUser = userService.saveUser(user);
            
            // Generate JWT token
            String token = jwtService.generateToken(savedUser.getEmail(), savedUser.getId());
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "User registered successfully");
            response.put("token", token);
            response.put("user", createUserResponse(savedUser));
            
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
            
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Registration failed: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@Valid @RequestBody LoginRequest loginRequest) {
        try {
            // Find user by email
            User user = userService.findByEmail(loginRequest.getEmail());
            if (user == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Invalid email or password");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
            
            // Check if user has a password (not a Google OAuth-only user)
            if (user.getPassword() == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "This account was created with Google. Please sign in with Google instead.");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
            
            // Check password
            if (!passwordEncoder.matches(loginRequest.getPassword(), user.getPassword())) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Invalid email or password");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
            
            // Update last login
            user.setLastLogin(LocalDateTime.now());
            userService.saveUser(user);
            
            // Generate JWT token
            String token = jwtService.generateToken(user.getEmail(), user.getId());
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Login successful");
            response.put("token", token);
            response.put("user", createUserResponse(user));
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Login failed: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    @PostMapping("/logout/spring")
    public ResponseEntity<Map<String, Object>> springSecurityLogout(HttpServletRequest request, HttpServletResponse response) {
        Map<String, Object> responseBody = new HashMap<>();
        
        try {
            // Invalidate Spring Security session
            if (request.getSession(false) != null) {
                request.getSession().invalidate();
            }
            
            // Clear any Spring Security authentication
            SecurityContextHolder.clearContext();
            
            responseBody.put("success", true);
            responseBody.put("message", "Spring Security session cleared");
            
        } catch (Exception e) {
            responseBody.put("success", true);
            responseBody.put("message", "Logout completed");
            System.out.println("Spring Security logout error: " + e.getMessage());
        }
        
        return ResponseEntity.ok(responseBody);
    }
    
    @GetMapping("/debug/users")
    public ResponseEntity<Map<String, Object>> getAllUsers() {
        try {
            // This is just for debugging - remove in production
            java.util.List<User> users = userService.findAllUsers();
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("userCount", users.size());
            response.put("users", users);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Error fetching users: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }
    
    @GetMapping("/debug/blacklist")
    public ResponseEntity<Map<String, Object>> getBlacklistStatus() {
        try {
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("blacklistSize", jwtService.getBlacklistSize());
            response.put("message", "Token blacklist status retrieved");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Error getting blacklist status: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }
    
    @GetMapping("/debug/config")
    public ResponseEntity<Map<String, Object>> getConfig() {
        try {
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("frontendUrl", frontendProperties.getUrl());
            response.put("message", "Configuration retrieved");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Error getting config: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }
    
    private Map<String, Object> createUserResponse(User user) {
        Map<String, Object> userResponse = new HashMap<>();
        userResponse.put("id", user.getId());
        userResponse.put("googleId", user.getGoogleId());
        userResponse.put("email", user.getEmail());
        userResponse.put("name", user.getName());
        userResponse.put("picture", user.getPicture());
        userResponse.put("createdAt", user.getCreatedAt());
        userResponse.put("lastLogin", user.getLastLogin());
        userResponse.put("isActive", user.getIsActive());
        return userResponse;
    }
    
    // Request DTOs
    public static class RegisterRequest {
        @NotBlank(message = "Name is required")
        @Size(min = 2, max = 50, message = "Name must be between 2 and 50 characters")
        private String name;
        
        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        private String email;
        
        @NotBlank(message = "Password is required")
        @Size(min = 6, message = "Password must be at least 6 characters")
        private String password;
        
        // Getters and setters
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }
    
    public static class LoginRequest {
        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        private String email;
        
        @NotBlank(message = "Password is required")
        private String password;
        
        // Getters and setters
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }
}

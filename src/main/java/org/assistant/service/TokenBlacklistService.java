package org.assistant.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Service
public class TokenBlacklistService {
    
    @Value("${jwt.secret}")
    private String secret;
    
    // In-memory blacklist - in production, use Redis or database
    private final ConcurrentMap<String, Long> blacklistedTokens = new ConcurrentHashMap<>();
    
    // Clean up expired tokens periodically
    private final Set<String> expiredTokens = ConcurrentHashMap.newKeySet();
    
    public void blacklistToken(String token) {
        try {
            // Extract expiration time from token
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(getSigningKey())
                    .build()
                    .parseClaimsJws(token)
                    .getBody();
            
            Long expirationTime = claims.getExpiration().getTime();
            
            // Store token with its expiration time
            blacklistedTokens.put(token, expirationTime);
            
            // Clean up expired tokens
            cleanupExpiredTokens();
            
        } catch (Exception e) {
            // If token is invalid, we don't need to blacklist it
            System.out.println("Invalid token during blacklist: " + e.getMessage());
        }
    }
    
    public boolean isTokenBlacklisted(String token) {
        // Check if token is in blacklist
        if (blacklistedTokens.containsKey(token)) {
            return true;
        }
        
        // Clean up expired tokens and check again
        cleanupExpiredTokens();
        return blacklistedTokens.containsKey(token);
    }
    
    public void blacklistAllUserTokens(Long userId) {
        // In a more sophisticated implementation, you would:
        // 1. Store user-token mappings
        // 2. Blacklist all tokens for a specific user
        // For now, we'll just clean up expired tokens
        cleanupExpiredTokens();
    }
    
    private void cleanupExpiredTokens() {
        long currentTime = System.currentTimeMillis();
        
        // Remove expired tokens from blacklist
        blacklistedTokens.entrySet().removeIf(entry -> entry.getValue() < currentTime);
    }
    
    public int getBlacklistSize() {
        cleanupExpiredTokens();
        return blacklistedTokens.size();
    }
    
    private SecretKey getSigningKey() {
        byte[] keyBytes = secret.getBytes();
        return new javax.crypto.spec.SecretKeySpec(keyBytes, "HmacSHA256");
    }
}

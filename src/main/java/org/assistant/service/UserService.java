package org.assistant.service;

import org.assistant.entity.User;
import org.assistant.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class UserService {
    
    @Autowired
    private UserRepository userRepository;
    
    public User saveOrUpdateUser(User user) {
        Optional<User> existingUser = userRepository.findByGoogleId(user.getGoogleId());
        
        if (existingUser.isPresent()) {
            User userToUpdate = existingUser.get();
            userToUpdate.setName(user.getName());
            userToUpdate.setPicture(user.getPicture());
            userToUpdate.setLastLogin(LocalDateTime.now());
            userToUpdate.setIsActive(true);
            return userRepository.save(userToUpdate);
        } else {
            return userRepository.save(user);
        }
    }
    
    public Optional<User> findByGoogleId(String googleId) {
        return userRepository.findByGoogleId(googleId);
    }

    
    public User findByEmail(String email) {
        return userRepository.findByEmail(email).orElse(null);
    }
    
    public User saveUser(User user) {
        return userRepository.save(user);
    }
    
    public User findById(Long id) {
        return userRepository.findById(id).orElse(null);
    }
    
    public boolean existsByGoogleId(String googleId) {
        return userRepository.existsByGoogleId(googleId);
    }
    
    public boolean existsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }
    
    public java.util.List<User> findAllUsers() {
        return userRepository.findAll();
    }
    
    public User getOrCreateUser(OAuth2User principal) {
        String googleId = principal.getName(); // This will be 'sub' from Google OAuth
        String email = principal.getAttribute("email");
        String name = principal.getAttribute("name");
        String picture = principal.getAttribute("picture");
        
        // Create or update user
        User user = new User(googleId, email, name, picture);
        return saveOrUpdateUser(user);
    }
}

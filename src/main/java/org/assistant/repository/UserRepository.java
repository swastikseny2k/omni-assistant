package org.assistant.repository;

import org.assistant.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    
    Optional<User> findByGoogleId(String googleId);
    
    Optional<User> findByEmail(String email);
    
    boolean existsByGoogleId(String googleId);
    
    boolean existsByEmail(String email);
}

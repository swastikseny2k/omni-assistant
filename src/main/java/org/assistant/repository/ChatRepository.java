package org.assistant.repository;

import org.assistant.entity.Chat;
import org.assistant.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatRepository extends JpaRepository<Chat, Long> {
    
    List<Chat> findByUserAndIsActiveTrueOrderByUpdatedAtDesc(User user);
    
    Optional<Chat> findByIdAndUserAndIsActiveTrue(Long id, User user);
    
    @Query("SELECT c FROM Chat c WHERE c.user = :user AND c.isActive = true ORDER BY c.updatedAt DESC")
    List<Chat> findActiveChatsByUser(@Param("user") User user);
    
    @Query("SELECT c FROM Chat c WHERE c.user = :user AND c.title LIKE %:title% AND c.isActive = true ORDER BY c.updatedAt DESC")
    List<Chat> findByUserAndTitleContainingIgnoreCaseAndIsActiveTrue(@Param("user") User user, @Param("title") String title);
    
    long countByUserAndIsActiveTrue(User user);
}

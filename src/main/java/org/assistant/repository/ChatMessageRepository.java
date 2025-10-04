package org.assistant.repository;

import org.assistant.entity.Chat;
import org.assistant.entity.ChatMessage;
import org.assistant.entity.MessageRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    
    List<ChatMessage> findByChatOrderByCreatedAtAsc(Chat chat);
    
    @Query("SELECT cm FROM ChatMessage cm WHERE cm.chat = :chat ORDER BY cm.createdAt ASC")
    List<ChatMessage> findMessagesByChatOrderByCreatedAt(@Param("chat") Chat chat);
    
    @Query("SELECT cm FROM ChatMessage cm WHERE cm.chat = :chat AND cm.role = :role ORDER BY cm.createdAt ASC")
    List<ChatMessage> findByChatAndRoleOrderByCreatedAtAsc(@Param("chat") Chat chat, @Param("role") MessageRole role);
    
    @Query("SELECT cm FROM ChatMessage cm WHERE cm.chat = :chat ORDER BY cm.createdAt DESC LIMIT :limit")
    List<ChatMessage> findLatestMessagesByChat(@Param("chat") Chat chat, @Param("limit") int limit);
    
    long countByChat(Chat chat);
}

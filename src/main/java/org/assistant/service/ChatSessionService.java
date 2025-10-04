package org.assistant.service;

import org.assistant.entity.Chat;
import org.assistant.entity.ChatMessage;
import org.assistant.entity.MessageRole;
import org.assistant.entity.User;
import org.assistant.repository.ChatMessageRepository;
import org.assistant.repository.ChatRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class ChatSessionService {
    
    @Autowired
    private ChatRepository chatRepository;
    
    @Autowired
    private ChatMessageRepository chatMessageRepository;
    
    // Create a new chat session
    public Chat createChat(User user, String title) {
        Chat chat = new Chat(user, title);
        return chatRepository.save(chat);
    }
    
    // Get or create a chat session
    public Chat getOrCreateChat(User user, Long chatId, String title) {
        if (chatId != null) {
            Optional<Chat> existingChat = chatRepository.findByIdAndUserAndIsActiveTrue(chatId, user);
            if (existingChat.isPresent()) {
                return existingChat.get();
            }
        }
        
        // Create new chat if no valid chatId provided or chat not found
        return createChat(user, title != null ? title : "New Chat");
    }
    
    // Add a message to a chat
    public ChatMessage addMessage(Chat chat, MessageRole role, String content) {
        ChatMessage message = new ChatMessage(chat, role, content);
        chat.addMessage(message);
        return chatMessageRepository.save(message);
    }
    
    // Add a message with model information
    public ChatMessage addMessage(Chat chat, MessageRole role, String content, String model) {
        ChatMessage message = new ChatMessage(chat, role, content, model);
        chat.addMessage(message);
        return chatMessageRepository.save(message);
    }
    
    // Add a function call message
    public ChatMessage addFunctionMessage(Chat chat, String functionName, String functionArgs, String content) {
        ChatMessage message = new ChatMessage(chat, MessageRole.FUNCTION, content);
        message.setFunctionName(functionName);
        message.setFunctionArgs(functionArgs);
        chat.addMessage(message);
        return chatMessageRepository.save(message);
    }
    
    // Get chat history for context
    public List<ChatMessage> getChatHistory(Chat chat, int maxMessages) {
        if (maxMessages <= 0) {
            return chatMessageRepository.findMessagesByChatOrderByCreatedAt(chat);
        }
        return chatMessageRepository.findLatestMessagesByChat(chat, maxMessages);
    }
    
    // Get all messages for a chat
    public List<ChatMessage> getAllMessages(Chat chat) {
        return chatMessageRepository.findMessagesByChatOrderByCreatedAt(chat);
    }
    
    // Get user's active chats
    public List<Chat> getUserChats(User user) {
        return chatRepository.findActiveChatsByUser(user);
    }
    
    // Get a specific chat
    public Optional<Chat> getChat(Long chatId, User user) {
        return chatRepository.findByIdAndUserAndIsActiveTrue(chatId, user);
    }
    
    // Update chat title
    public Chat updateChatTitle(Chat chat, String newTitle) {
        chat.setTitle(newTitle);
        chat.setUpdatedAt(LocalDateTime.now());
        return chatRepository.save(chat);
    }
    
    // Archive/Deactivate a chat
    public void archiveChat(Chat chat) {
        chat.setIsActive(false);
        chat.setUpdatedAt(LocalDateTime.now());
        chatRepository.save(chat);
    }
    
    // Delete a chat and all its messages
    public void deleteChat(Chat chat) {
        chatMessageRepository.deleteAll(chat.getMessages());
        chatRepository.delete(chat);
    }
    
    // Get chat statistics
    public long getChatCount(User user) {
        return chatRepository.countByUserAndIsActiveTrue(user);
    }
    
    // Search chats by title
    public List<Chat> searchChats(User user, String searchTerm) {
        return chatRepository.findByUserAndTitleContainingIgnoreCaseAndIsActiveTrue(user, searchTerm);
    }
}

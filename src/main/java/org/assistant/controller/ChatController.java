package org.assistant.controller;

import org.assistant.entity.Chat;
import org.assistant.entity.User;
import org.assistant.service.ChatService;
import org.assistant.service.ChatSessionService;
import org.assistant.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
public class ChatController {
    
    @Autowired
    private ChatService chatService;
    
    @Autowired
    private UserService userService;
    
    @Autowired
    private ChatSessionService chatSessionService;
    
    /**
     * Helper method to get the current user from either OAuth2User or User authentication
     */
    private User getCurrentUser(Authentication authentication) {
        if (authentication == null) {
            return null;
        }
        
        Object principal = authentication.getPrincipal();
        
        if (principal instanceof User) {
            // JWT authentication - principal is already a User
            return (User) principal;
        } else if (principal instanceof OAuth2User) {
            // OAuth2 authentication - need to get/create user from OAuth2User
            OAuth2User oauth2User = (OAuth2User) principal;
            return userService.getOrCreateUser(oauth2User);
        }
        
        return null;
    }
    
    @PostMapping("/message")
    public ResponseEntity<Map<String, Object>> sendMessage(@RequestBody Map<String, Object> request,
                                                          Authentication authentication) {
        try {
            String message = (String) request.get("message");
            String model = (String) request.get("model");
            Long chatId = request.get("chatId") != null ? Long.valueOf(request.get("chatId").toString()) : null;
            String chatTitle = (String) request.get("chatTitle");
            
            if (message == null || message.trim().isEmpty()) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Message cannot be empty");
                return ResponseEntity.badRequest().body(response);
            }
            
            // Get the current user for function calling
            User user = getCurrentUser(authentication);
            if (user == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "User not authenticated. Please log in to use chat functionality.");
                return ResponseEntity.status(401).body(response);
            }
            
            String response = chatService.sendMessage(message, model, user, chatId, chatTitle);
            
            // Get the chat that was used/created
            Chat chat = chatSessionService.getOrCreateChat(user, chatId, chatTitle);
            
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("response", response);
            result.put("model", model);
            result.put("chatId", chat.getId());
            result.put("chatTitle", chat.getTitle());
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Error: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }
    
    @GetMapping("/models")
    public ResponseEntity<Map<String, Object>> getAvailableModels() {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("models", chatService.getAvailableModels());
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/chats")
    public ResponseEntity<Map<String, Object>> getUserChats(Authentication authentication) {
        try {
            User user = getCurrentUser(authentication);
            if (user == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "User not authenticated");
                return ResponseEntity.status(401).body(response);
            }
            
            var chats = chatSessionService.getUserChats(user);
            
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("chats", chats);
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Error: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }
    
    @GetMapping("/chats/{chatId}")
    public ResponseEntity<Map<String, Object>> getChat(@PathVariable Long chatId, Authentication authentication) {
        try {
            User user = getCurrentUser(authentication);
            if (user == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "User not authenticated");
                return ResponseEntity.status(401).body(response);
            }
            
            var chat = chatSessionService.getChat(chatId, user);
            if (chat.isEmpty()) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Chat not found");
                return ResponseEntity.status(404).body(response);
            }
            
            var messages = chatSessionService.getAllMessages(chat.get());
            
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("chat", chat.get());
            result.put("messages", messages);
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Error: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }
    
    @PostMapping("/chats")
    public ResponseEntity<Map<String, Object>> createChat(@RequestBody Map<String, String> request, Authentication authentication) {
        try {
            User user = getCurrentUser(authentication);
            if (user == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "User not authenticated");
                return ResponseEntity.status(401).body(response);
            }
            
            String title = request.get("title");
            if (title == null || title.trim().isEmpty()) {
                title = "New Chat";
            }
            
            Chat chat = chatSessionService.createChat(user, title);
            
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("chat", chat);
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Error: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }
    
    @PutMapping("/chats/{chatId}/title")
    public ResponseEntity<Map<String, Object>> updateChatTitle(@PathVariable Long chatId, 
                                                              @RequestBody Map<String, String> request, 
                                                              Authentication authentication) {
        try {
            User user = getCurrentUser(authentication);
            if (user == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "User not authenticated");
                return ResponseEntity.status(401).body(response);
            }
            
            var chat = chatSessionService.getChat(chatId, user);
            if (chat.isEmpty()) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Chat not found");
                return ResponseEntity.status(404).body(response);
            }
            
            String newTitle = request.get("title");
            if (newTitle == null || newTitle.trim().isEmpty()) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Title cannot be empty");
                return ResponseEntity.badRequest().body(response);
            }
            
            Chat updatedChat = chatSessionService.updateChatTitle(chat.get(), newTitle);
            
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("chat", updatedChat);
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Error: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }
    
    @DeleteMapping("/chats/{chatId}")
    public ResponseEntity<Map<String, Object>> deleteChat(@PathVariable Long chatId, Authentication authentication) {
        try {
            User user = getCurrentUser(authentication);
            if (user == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "User not authenticated");
                return ResponseEntity.status(401).body(response);
            }
            
            var chat = chatSessionService.getChat(chatId, user);
            if (chat.isEmpty()) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Chat not found");
                return ResponseEntity.status(404).body(response);
            }
            
            chatSessionService.deleteChat(chat.get());
            
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("message", "Chat deleted successfully");
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Error: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }
}

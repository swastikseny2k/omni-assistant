package org.assistant.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Entity
@Table(name = "chat_messages")
public class ChatMessage {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chat_id", nullable = false)
    private Chat chat;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    private MessageRole role;
    
    @Column(name = "content", columnDefinition = "TEXT", nullable = false)
    private String content;
    
    @Column(name = "model")
    private String model;
    
    @Column(name = "function_name")
    private String functionName;
    
    @Column(name = "function_args", columnDefinition = "TEXT")
    private String functionArgs;
    
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    
    // Constructors
    public ChatMessage() {}
    
    public ChatMessage(Chat chat, MessageRole role, String content) {
        this.chat = chat;
        this.role = role;
        this.content = content;
        this.createdAt = LocalDateTime.now(ZoneOffset.UTC);
    }
    
    public ChatMessage(Chat chat, MessageRole role, String content, String model) {
        this.chat = chat;
        this.role = role;
        this.content = content;
        this.model = model;
        this.createdAt = LocalDateTime.now(ZoneOffset.UTC);
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public Chat getChat() {
        return chat;
    }
    
    public void setChat(Chat chat) {
        this.chat = chat;
    }
    
    public MessageRole getRole() {
        return role;
    }
    
    public void setRole(MessageRole role) {
        this.role = role;
    }
    
    public String getContent() {
        return content;
    }
    
    public void setContent(String content) {
        this.content = content;
    }
    
    public String getModel() {
        return model;
    }
    
    public void setModel(String model) {
        this.model = model;
    }
    
    public String getFunctionName() {
        return functionName;
    }
    
    public void setFunctionName(String functionName) {
        this.functionName = functionName;
    }
    
    public String getFunctionArgs() {
        return functionArgs;
    }
    
    public void setFunctionArgs(String functionArgs) {
        this.functionArgs = functionArgs;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}

package org.assistant.service;

import org.assistant.entity.Chat;
import org.assistant.entity.ChatMessage;
import org.assistant.entity.MessageRole;
import org.assistant.entity.Task;
import org.assistant.entity.TaskPriority;
import org.assistant.entity.TaskStatus;
import org.assistant.entity.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ChatService {
    
    @Value("${spring.ai.openai.api-key:}")
    private String openAiApiKey;
    
    @Value("${spring.ai.deepseek.api-key:}")
    private String deepSeekApiKey;
    
    @Autowired
    private TaskService taskService;
    
    @Autowired
    private UserService userService;
    
    @Autowired
    private ChatSessionService chatSessionService;
    
    private final RestTemplate restTemplate = new RestTemplate();
    
    public String sendMessage(String message, String model, User user) {
        return sendMessage(message, model, user, null, null);
    }
    
    public String sendMessage(String message, String model, User user, Long chatId, String chatTitle) {
        if (model == null) model = "openai";
        
        if (user == null) {
            throw new IllegalArgumentException("User must be authenticated to use chat functionality");
        }
        
        // Get or create chat session
        Chat chat = chatSessionService.getOrCreateChat(user, chatId, chatTitle);
        
        // Add user message to chat history
        chatSessionService.addMessage(chat, MessageRole.USER, message);
        
        String response;
        switch (model.toLowerCase()) {
            case "openai":
                response = sendOpenAiMessageWithFunctions(message, user, chat);
                break;
            case "deepseek":
                response = sendDeepSeekMessage(message, user, chat);
                break;
            default:
                throw new IllegalArgumentException("Unsupported model: " + model);
        }
        
        // Add assistant response to chat history
        chatSessionService.addMessage(chat, MessageRole.ASSISTANT, response, model);
        
        return response;
    }
    
    private String sendOpenAiMessageWithFunctions(String message, User user, Chat chat) {
        if (openAiApiKey == null || openAiApiKey.isEmpty()) {
            throw new RuntimeException("OpenAI not configured. Set OPENAI_API_KEY environment variable.");
        }
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + openAiApiKey);
        
        List<Map<String, Object>> functions = createFunctions();
        
        // Build conversation history
        List<Map<String, Object>> messages = buildConversationHistory(chat, message);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", "gpt-4o-mini");
        requestBody.put("messages", messages);
        requestBody.put("functions", functions);
        requestBody.put("function_call", "auto");
        requestBody.put("max_tokens", 1000);
        requestBody.put("temperature", 0.7);
        
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
        
        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(
                "https://api.openai.com/v1/chat/completions", entity, Map.class);
            
            Map<String, Object> responseBody = response.getBody();
            if (responseBody != null && responseBody.containsKey("choices")) {
                List<Map<String, Object>> choices = (List<Map<String, Object>>) responseBody.get("choices");
                if (!choices.isEmpty()) {
                    Map<String, Object> choice = choices.get(0);
                    Map<String, Object> messageObj = (Map<String, Object>) choice.get("message");
                    
                    // Check if the AI wants to call a function
                    if (messageObj.containsKey("function_call")) {
                        return handleFunctionCall((Map<String, Object>) messageObj.get("function_call"), user, chat);
                    }
                    
                    return (String) messageObj.get("content");
                }
            }
            throw new RuntimeException("Failed to get response from OpenAI API");
        } catch (Exception e) {
            throw new RuntimeException("OpenAI API error: " + e.getMessage());
        }
    }

    private String handleFunctionCall(Map<String, Object> functionCall, User user, Chat chat) {
        String functionName = (String) functionCall.get("name");
        String functionArgs = (String) functionCall.get("arguments");
        
        System.out.println("Function call received - Name: " + functionName + ", Args: " + functionArgs + ", User: " + (user != null ? user.getEmail() : "null"));

        String result;
        if ("create_task".equals(functionName) && user != null) {
            result = handleCreateTaskFunction(functionArgs, user);
        } else if ("create_multiple_tasks".equals(functionName) && user != null) {
            result = handleCreateMultipleTasksFunction(functionArgs, user);
        } else if ("get_all_tasks".equals(functionName) && user != null) {
            result = handleGetAllTasksFunction(user);
        } else if ("filter_tasks".equals(functionName) && user != null) {
            result = handleFilterTasksFunction(functionArgs, user);
        } else {
            result = "Could not execute function: " + functionName;
        }
        
        // Save function call to chat history
        chatSessionService.addFunctionMessage(chat, functionName, functionArgs, result);
        
        return result;
    }

    private List<Map<String, Object>> createFunctions() {
        Map<String, Object> createTaskFunction = new HashMap<>();
        createTaskFunction.put("name", "create_task");
        createTaskFunction.put("description", "Create a new task for the user");
        createTaskFunction.put("parameters", Map.of(
                "type", "object",
                "properties", Map.of(
                        "title", Map.of("type", "string", "description", "The title of the task"),
                        "description", Map.of("type", "string", "description", "Optional description of the task"),
                        "priority", Map.of("type", "string", "enum", Arrays.asList("LOW", "MEDIUM", "HIGH", "URGENT"), "description", "Priority level of the task"),
                        "dueDate", Map.of("type", "string",  "description", "Due date of the task")
                ),
                "required", Arrays.asList("title")
        ));

        // Define the get all tasks function
        Map<String, Object> getAllTasksFunction = new HashMap<>();
        getAllTasksFunction.put("name", "get_all_tasks");
        getAllTasksFunction.put("description", "Get all tasks for the user");
        getAllTasksFunction.put("parameters", Map.of(
                "type", "object",
                "properties", Map.of(),
                "required", Arrays.asList()
        ));

        // Define the filter tasks function
        Map<String, Object> filterTasksFunction = new HashMap<>();
        filterTasksFunction.put("name", "filter_tasks");
        filterTasksFunction.put("description", "Filter tasks by status, priority, or search term");
        filterTasksFunction.put("parameters", Map.of(
                "type", "object",
                "properties", Map.of(
                        "status", Map.of("type", "string", "enum", Arrays.asList("TODO", "IN_PROGRESS", "COMPLETED", "CANCELLED"), "description", "Filter by task status"),
                        "priority", Map.of("type", "string", "enum", Arrays.asList("LOW", "MEDIUM", "HIGH", "URGENT"), "description", "Filter by task priority"),
                        "searchTerm", Map.of("type", "string", "description", "Search term to filter tasks by title or description"),
                        "overdue", Map.of("type", "boolean", "description", "Filter for overdue tasks only"),
                        "dueSoon", Map.of("type", "integer", "description", "Filter for tasks due within specified hours")
                ),
                "required", Arrays.asList()
        ));

        // Define the create multiple tasks function
        Map<String, Object> createMultipleTasksFunction = new HashMap<>();
        createMultipleTasksFunction.put("name", "create_multiple_tasks");
        createMultipleTasksFunction.put("description", "Create multiple tasks at once for the user");
        createMultipleTasksFunction.put("parameters", Map.of(
                "type", "object",
                "properties", Map.of(
                        "tasks", Map.of(
                                "type", "array",
                                "description", "Array of tasks to create",
                                "items", Map.of(
                                        "type", "object",
                                        "properties", Map.of(
                                                "title", Map.of("type", "string", "description", "The title of the task"),
                                                "description", Map.of("type", "string", "description", "Optional description of the task"),
                                                "priority", Map.of("type", "string", "enum", Arrays.asList("LOW", "MEDIUM", "HIGH", "URGENT"), "description", "Priority level of the task"),
                                                "dueDate", Map.of("type", "string", "description", "Due date of the task")
                                        ),
                                        "required", Arrays.asList("title")
                                )
                        )
                ),
                "required", Arrays.asList("tasks")
        ));

        return Arrays.asList(createTaskFunction, getAllTasksFunction, filterTasksFunction, createMultipleTasksFunction);
    }
    
    private List<Map<String, Object>> buildConversationHistory(Chat chat, String currentMessage) {
        List<Map<String, Object>> messages = new ArrayList<>();
        
        // Get recent chat history (last 10 messages to avoid token limits)
        List<ChatMessage> chatHistory = chatSessionService.getChatHistory(chat, 10);
        
        // Add system message for context
        messages.add(Map.of(
            "role", "system",
            "content", "You are a helpful task management assistant. You can help users create, view, and manage their tasks. Always be helpful and provide clear responses. Ask the user about tasks fields if you are not able to determine them"
        ));
        
        // Add conversation history
        for (ChatMessage chatMessage : chatHistory) {
            Map<String, Object> message = new HashMap<>();
            
            if (chatMessage.getRole() == MessageRole.FUNCTION && chatMessage.getFunctionName() != null) {
                // For function messages, we need to add the function name and content
                // Function messages have role "function" and require a "name" field
                message.put("role", "function");
                message.put("name", chatMessage.getFunctionName());
                message.put("content", chatMessage.getContent());
            } else {
                // For regular messages (user, assistant, system)
                message.put("role", chatMessage.getRole().getValue());
                message.put("content", chatMessage.getContent());
            }
            
            messages.add(message);
        }
        
        // Add current user message
        messages.add(Map.of("role", "user", "content", currentMessage));
        
        return messages;
    }

    private String sendDeepSeekMessage(String message, User user, Chat chat) {
        if (deepSeekApiKey == null || deepSeekApiKey.isEmpty()) {
            throw new RuntimeException("DeepSeek not configured. Set DEEPSEEK_API_KEY environment variable.");
        }
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + deepSeekApiKey);

        List<Map<String, Object>> functions = createFunctions();

        List<Map<String, Object>> tools = new ArrayList<>();
        for (Map<String, Object> function : functions) {
            tools.add(Map.of("function", function));
        }
        
        // Build conversation history
        List<Map<String, Object>> messages = buildConversationHistory(chat, message);

        
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", "deepseek-ai/DeepSeek-R1-0528");
        requestBody.put("messages", messages);
        requestBody.put("tools", tools);
        requestBody.put("tool_choice", "auto");
        requestBody.put("max_tokens", 1000);
        requestBody.put("temperature", 0.7);
        
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
        
        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(
                "https://api.deepinfra.com/v1/openai/chat/completions", entity, Map.class);
            
            Map<String, Object> responseBody = response.getBody();
            if (responseBody != null && responseBody.containsKey("choices")) {
                List<Map<String, Object>> choices = (List<Map<String, Object>>) responseBody.get("choices");
                if (!choices.isEmpty()) {
                    Map<String, Object> choice = choices.get(0);
                    Map<String, Object> messageObj = (Map<String, Object>) choice.get("message");

                    // Check if the AI wants to call a function
                    if (messageObj.containsKey("tool_calls")) {
                        List<Map<String, Object>> toolCalls = (List<Map<String, Object>>) messageObj.get("tool_calls");
                        if (!toolCalls.isEmpty()) {
                            Map<String, Object> toolCall = toolCalls.get(0);
                            Map<String, Object> function = (Map<String, Object>) toolCall.get("function");
                            return handleFunctionCall(function, user, chat);
                        }
                    }

                    return (String) messageObj.get("content");
                }
            }
            throw new RuntimeException("Failed to get response from DeepSeek API");
        } catch (Exception e) {
            throw new RuntimeException("DeepSeek API error: " + e.getMessage());
        }
    }
    
    private String handleCreateTaskFunction(String functionArgs, User user) {
        try {
            // Parse the JSON arguments
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            Map<String, Object> args = mapper.readValue(functionArgs, Map.class);
            
            String title = (String) args.get("title");
            String description = (String) args.getOrDefault("description", "");
            String priorityStr = (String) args.getOrDefault("priority", "MEDIUM");
            String dueDate = (String) args.getOrDefault("dueDate", null);

            // Create the task
            Task task = new Task(title, description, user);
            
            // Only set due date if it's provided and not null
            if (dueDate != null && !dueDate.trim().isEmpty() && !"null".equals(dueDate)) {
                try {
                    task.setDueDate(LocalDateTime.parse(dueDate));
                } catch (Exception e) {
                    // If parsing fails, just skip setting the due date
                    System.out.println("Warning: Could not parse due date: " + dueDate);
                }
            }
            // Set priority
            try {
                TaskPriority priority = TaskPriority.valueOf(priorityStr.toUpperCase());
                task.setPriority(priority);
            } catch (IllegalArgumentException e) {
                task.setPriority(TaskPriority.MEDIUM);
            }
            
            Task createdTask = taskService.createTask(task);
            
            return String.format("✅ I've created a new task for you: \"%s\" (Priority: %s). The task has been added to your task list on the right side of the screen.", 
                createdTask.getTitle(), createdTask.getPriority().getDisplayName());
                
        } catch (Exception e) {
            return "❌ I encountered an error while creating the task: " + e.getMessage() + ". Please try again.";
        }
    }
    
    private String handleCreateMultipleTasksFunction(String functionArgs, User user) {
        try {
            // Parse the JSON arguments
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            Map<String, Object> args = mapper.readValue(functionArgs, Map.class);
            
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> tasksData = (List<Map<String, Object>>) args.get("tasks");
            
            if (tasksData == null || tasksData.isEmpty()) {
                return "❌ No tasks provided to create.";
            }
            
            List<Task> tasks = new ArrayList<>();
            
            for (Map<String, Object> taskData : tasksData) {
                String title = (String) taskData.get("title");
                String description = (String) taskData.getOrDefault("description", "");
                String priorityStr = (String) taskData.getOrDefault("priority", "MEDIUM");
                String dueDate = (String) taskData.getOrDefault("dueDate", null);
                
                if (title == null || title.trim().isEmpty()) {
                    continue; // Skip tasks without titles
                }
                
                Task task = new Task(title, description, user);
                
                // Only set due date if it's provided and not null
                if (dueDate != null && !dueDate.trim().isEmpty() && !"null".equals(dueDate)) {
                    try {
                        task.setDueDate(LocalDateTime.parse(dueDate));
                    } catch (Exception e) {
                        // If parsing fails, just skip setting the due date
                        System.out.println("Warning: Could not parse due date: " + dueDate);
                    }
                }
                
                // Set priority
                try {
                    TaskPriority priority = TaskPriority.valueOf(priorityStr.toUpperCase());
                    task.setPriority(priority);
                } catch (IllegalArgumentException e) {
                    task.setPriority(TaskPriority.MEDIUM);
                }
                
                tasks.add(task);
            }
            
            if (tasks.isEmpty()) {
                return "❌ No valid tasks to create (all tasks must have titles).";
            }
            
            List<Task> createdTasks = taskService.createTasksBatch(tasks);
            
            StringBuilder response = new StringBuilder();
            response.append(String.format("✅ I've successfully created %d task(s) for you:\n\n", createdTasks.size()));
            
            for (int i = 0; i < createdTasks.size(); i++) {
                Task task = createdTasks.get(i);
                response.append(String.format("%d. **%s** (Priority: %s)\n", 
                    i + 1, task.getTitle(), task.getPriority().getDisplayName()));
            }
            
            response.append("\nAll tasks have been added to your task list on the right side of the screen.");
            
            return response.toString();
                
        } catch (Exception e) {
            return "❌ I encountered an error while creating the tasks: " + e.getMessage() + ". Please try again.";
        }
    }
    
    private String handleGetAllTasksFunction(User user) {
        try {
            List<Task> tasks = taskService.getTasksByOwner(user);
            
            if (tasks.isEmpty()) {
                return "📝 You don't have any tasks yet. You can create a new task by asking me to create one for you!";
            }
            
            StringBuilder response = new StringBuilder("📋 Here are all your tasks:\n\n");
            
            for (int i = 0; i < tasks.size(); i++) {
                Task task = tasks.get(i);
                response.append(String.format("%d. **%s**\n", i + 1, task.getTitle()));
                response.append(String.format("   Status: %s | Priority: %s\n", 
                    task.getStatus().getDisplayName(), task.getPriority().getDisplayName()));
                
                if (task.getDescription() != null && !task.getDescription().trim().isEmpty()) {
                    response.append(String.format("   Description: %s\n", task.getDescription()));
                }
                
                if (task.getDueDate() != null) {
                    response.append(String.format("   Due: %s\n", task.getDueDate().toString()));
                }
                
                response.append("\n");
            }
            
            return response.toString();
        } catch (Exception e) {
            return "❌ I encountered an error while retrieving your tasks: " + e.getMessage() + ". Please try again.";
        }
    }
    
    private String handleFilterTasksFunction(String functionArgs, User user) {
        try {
            // Parse the JSON arguments
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            Map<String, Object> args = mapper.readValue(functionArgs, Map.class);
            
            List<Task> tasks = new ArrayList<>();
            
            // Check for specific filters
            if (args.containsKey("status")) {
                String statusStr = (String) args.get("status");
                try {
                    TaskStatus status = TaskStatus.valueOf(statusStr.toUpperCase());
                    tasks = taskService.getTasksByOwnerAndStatus(user, status);
                } catch (IllegalArgumentException e) {
                    return "❌ Invalid status filter. Valid statuses are: TODO, IN_PROGRESS, COMPLETED, CANCELLED";
                }
            } else if (args.containsKey("priority")) {
                String priorityStr = (String) args.get("priority");
                try {
                    TaskPriority priority = TaskPriority.valueOf(priorityStr.toUpperCase());
                    tasks = taskService.getTasksByOwnerAndPriority(user, priority);
                } catch (IllegalArgumentException e) {
                    return "❌ Invalid priority filter. Valid priorities are: LOW, MEDIUM, HIGH, URGENT";
                }
            } else if (args.containsKey("overdue") && (Boolean) args.get("overdue")) {
                tasks = taskService.getOverdueTasks(user);
            } else if (args.containsKey("dueSoon")) {
                Integer hours = (Integer) args.get("dueSoon");
                tasks = taskService.getTasksDueSoon(user, hours);
            } else if (args.containsKey("searchTerm")) {
                String searchTerm = (String) args.get("searchTerm");
                // Search in both title and description
                List<Task> titleResults = taskService.searchTasksByTitle(user, searchTerm);
                List<Task> descResults = taskService.searchTasksByDescription(user, searchTerm);
                
                // Combine and remove duplicates
                tasks = new ArrayList<>(titleResults);
                for (Task task : descResults) {
                    if (!tasks.contains(task)) {
                        tasks.add(task);
                    }
                }
            } else {
                // No specific filter, return all tasks
                tasks = taskService.getTasksByOwner(user);
            }
            
            if (tasks.isEmpty()) {
                return "📝 No tasks found matching your criteria.";
            }
            
            StringBuilder response = new StringBuilder("📋 Here are your filtered tasks:\n\n");
            
            for (int i = 0; i < tasks.size(); i++) {
                Task task = tasks.get(i);
                response.append(String.format("%d. **%s**\n", i + 1, task.getTitle()));
                response.append(String.format("   Status: %s | Priority: %s\n", 
                    task.getStatus().getDisplayName(), task.getPriority().getDisplayName()));
                
                if (task.getDescription() != null && !task.getDescription().trim().isEmpty()) {
                    response.append(String.format("   Description: %s\n", task.getDescription()));
                }
                
                if (task.getDueDate() != null) {
                    response.append(String.format("   Due: %s\n", task.getDueDate().toString()));
                }
                
                response.append("\n");
            }
            
            return response.toString();
        } catch (Exception e) {
            return "❌ I encountered an error while filtering your tasks: " + e.getMessage() + ". Please try again.";
        }
    }
    
    public List<String> getAvailableModels() {
        return Arrays.asList("openai", "deepseek");
    }
}

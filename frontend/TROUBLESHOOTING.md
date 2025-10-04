# Chat Functionality Troubleshooting Guide

## 🚨 **Common Issues and Solutions**

### **1. Model Dropdown Not Working**

**Symptoms:**
- Model dropdown is empty or doesn't show options
- Cannot select different AI models
- Dropdown appears disabled

**Solutions:**
1. **Check Backend Connection**: Look for the connection status indicator in the chat header
   - Green dot = Backend connected ✅
   - Red dot = Backend disconnected ❌

2. **Start Backend Server**:
   ```bash
   # Navigate to project root
   cd /Users/swastiksen/workspace/omni-assistant/omni-assistant
   
   # Set environment variables (if not already set)
   export DB_USERNAME=omni_user
   export DB_PASSWORD=omni_password
   export GOOGLE_CLIENT_ID=your-google-client-id
   export GOOGLE_CLIENT_SECRET=your-google-client-secret
   export JWT_SECRET=mySecretKey123456789012345678901234567890
   export OPENAI_API_KEY=your-openai-api-key
   export DEEPSEEK_API_KEY=your-deepseek-api-key
   
   # Start the backend
   ./gradlew bootRun
   ```

3. **Check Database**: Ensure MySQL is running and accessible
   ```bash
   # Start MySQL (if using provided scripts)
   ./scripts/start-mysql.sh
   ```

### **2. Chat Messages Not Sending**

**Symptoms:**
- Messages appear to send but no response from AI
- Send button becomes disabled permanently
- Error messages appear in the chat

**Solutions:**
1. **Verify Backend is Running**: Check `http://localhost:8080/api/auth/validate`
2. **Check API Keys**: Ensure OpenAI and DeepSeek API keys are set
3. **Review Error Messages**: Look at the error banner above the input area
4. **Check Browser Console**: Open DevTools (F12) and look for network errors

### **3. Backend Connection Issues**

**Symptoms:**
- "Backend Disconnected" status indicator
- Network errors in console
- Chat functionality completely unavailable

**Solutions:**
1. **Start Backend Server** (see step 1 above)
2. **Check Port Availability**: Ensure port 8080 is not used by another application
   ```bash
   # Check if port 8080 is in use
   lsof -i :8080
   ```
3. **Verify Environment Variables**: All required environment variables must be set
4. **Check Database Connection**: MySQL must be running and accessible

### **4. Authentication Issues**

**Symptoms:**
- "Authentication failed" errors
- Redirected to login page repeatedly
- JWT token errors

**Solutions:**
1. **Clear Browser Storage**:
   ```javascript
   // In browser console
   localStorage.clear();
   sessionStorage.clear();
   ```
2. **Re-login**: Log out and log back in
3. **Check JWT Secret**: Ensure `JWT_SECRET` environment variable is set

### **5. Function Calling Not Working**

**Symptoms:**
- AI responds with text but doesn't create tasks
- "Function calling not supported" messages
- Tasks not appearing in the system

**Solutions:**
1. **Use OpenAI Model**: Function calling only works with OpenAI GPT-4o-mini
2. **Check API Key**: Ensure OpenAI API key is valid and has function calling access
3. **Verify Backend Configuration**: Check that function calling is enabled in backend

## 🔧 **Step-by-Step Debugging**

### **Step 1: Check Backend Status**
1. Open browser to `http://localhost:8080/api/auth/validate`
2. Should return a JSON response if backend is running
3. If not, start the backend server

### **Step 2: Check Frontend Connection**
1. Open browser DevTools (F12)
2. Go to Network tab
3. Try to send a chat message
4. Look for failed requests (red entries)

### **Step 3: Verify Environment Variables**
```bash
# Check if environment variables are set
echo $DB_USERNAME
echo $GOOGLE_CLIENT_ID
echo $OPENAI_API_KEY
```

### **Step 4: Check Database**
```bash
# Connect to MySQL to verify database exists
mysql -u omni_user -p omni_assistant
```

## 🚀 **Quick Start Checklist**

- [ ] Backend server running on `http://localhost:8080`
- [ ] MySQL database running and accessible
- [ ] All environment variables set correctly
- [ ] OpenAI API key configured (for AI responses)
- [ ] DeepSeek API key configured (optional)
- [ ] User logged in successfully
- [ ] Browser console shows no errors

## 📞 **Getting Help**

If you're still experiencing issues:

1. **Check Browser Console**: Look for JavaScript errors
2. **Check Backend Logs**: Look at the terminal where backend is running
3. **Verify Network**: Ensure no firewall blocking localhost:8080
4. **Restart Everything**: Stop both frontend and backend, then restart

## 🔄 **Reset Everything**

If nothing works, try a complete reset:

```bash
# Stop all processes
pkill -f "gradle"
pkill -f "node"

# Clear browser storage
# (Do this in browser console)
localStorage.clear();

# Restart backend
cd /Users/swastiksen/workspace/omni-assistant/omni-assistant
./gradlew bootRun

# Restart frontend (in another terminal)
cd frontend
npm start
```

## ✅ **Success Indicators**

You'll know everything is working when:
- Backend status shows "Backend Connected" (green dot)
- Model dropdown shows "OpenAI GPT-4o-mini 🔧" and "DeepSeek"
- You can send messages and receive AI responses
- AI can create tasks when asked (using OpenAI model)
- Chat history persists between sessions

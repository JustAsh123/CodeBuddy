# 🚀 CodeBuddy – AI Mentor for LeetCode

> Solve problems. Don’t get spoon-fed.

CodeBuddy is a Chrome extension that helps you solve LeetCode problems by **guiding your thinking**, not giving away answers.

---

## 🎥 Demo


https://github.com/user-attachments/assets/84f98555-331e-4c92-8167-423a20c9f612


---

## ✨ Features

- 🧠 AI Code Analysis  
- 💡 Progressive Hint System  
- 🎯 Mentor-style guidance  
- 📊 Progress tracking  
- 🧩 Personalized feedback  
- ⚡ In-page UI (no popup)

---

## ⚙️ Tech Stack

- Frontend: Chrome Extension (Vanilla JS)
- Backend: Node.js / Express
- AI: Groq API
- Storage: localStorage

---

## 🚀 How to Run Locally

### 1. Clone the repo

    git clone https://github.com/your-username/codebuddy.git
    cd codebuddy

---

### 2. Setup Backend

    cd codebuddy-backend
    npm install

Create a `.env` file:

    GROQ_API_KEY=your_api_key_here

Run the server:

    node index.js

---

### 3. Load Extension

- Go to chrome://extensions  
- Enable Developer Mode  
- Click Load Unpacked  
- Select the `codebuddy-extension` folder  

---

### 4. Use It

- Open LeetCode  
- Solve a problem  
- Click Analyze Code  
- Get guided hints  

---

## 📦 Project Structure

    codebuddy-backend/     → API server  
    codebuddy-extension/  → Chrome extension  

---

## ⭐ If you like this project

Give it a star ⭐

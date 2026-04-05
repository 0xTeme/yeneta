# የኔታ | Yeneta 🎓

> **"Learn Smarter in Your Own Language."**

**Yeneta** is an AI-powered, personalized bilingual study assistant built specifically to empower Ethiopian students. It bridges the gap between complex study materials and accessible learning by providing document analysis, smart summaries, interactive quizzes, and voice-assisted tutoring in both **Amharic** and **English**.

Built by **CODE GE'EZ**.

---

## ✨ Key Features

*   **🤖 Smart AI Chat Tutor**: Context-aware conversational AI powered by Google's Gemini 1.5 Flash, tailored to the student's education level (Primary, High School, or University).
*   **🌍 True Bilingual Support**: Seamlessly chat, learn, and translate concepts between Amharic and English without losing academic context.
*   **📄 Document & Image Analysis**: Upload PDFs, Word Docs (.docx), PowerPoints (.pptx), TXT files, and Images. Yeneta instantly reads the content to explain, summarize, or test you on it.
*   **📝 Interactive Quiz Generation**: Automatically generate 5, 10, or 20-question multiple-choice quizzes directly from your uploaded study materials.
*   **🗣️ Voice-Enabled Learning (STT & TTS)**: 
    *   **Text-to-Speech**: Listen to AI responses in natural-sounding male or female Amharic/English voices.
    *   **Speech-to-Text**: Ask questions using your voice via built-in browser dictation and audio recording.
*   **🗂️ Session & Folder Management**: Automatically saves your chat history to the cloud. Organize your study sessions into custom folders.
*   **🎨 Premium UI & Theming**: A sleek, accessible, "Apple meets ChatGPT" interface with full Dark/Light mode support and Markdown/KaTeX math rendering.
*   **🔐 Secure Authentication**: One-click Google OAuth sign-in.

---

## 🛠️ Tech Stack

**Frontend:**
*   [Next.js 15](https://nextjs.org/) (App Router)
*   [React 19](https://react.dev/)
*   [Tailwind CSS v4](https://tailwindcss.com/)
*   [Lucide React](https://lucide.dev/) (Icons)
*   [Next-Themes](https://github.com/pacocoursey/next-themes) (Dark/Light mode)
*   React Markdown & KaTeX (Math equation rendering)

**Backend & AI:**
*   [Google Gemini API](https://ai.google.dev/) (`@google/generative-ai`)
*   Next.js Server Actions & API Routes
*   `mammoth` (DOCX parsing)
*   `msedge-tts` (Text-to-Speech synthesis)

**Database & Auth:**
*   [Prisma ORM](https://www.prisma.io/)
*   [PostgreSQL](https://postgresql.org/) (Hosted on Neon)
*   [NextAuth.js](https://next-auth.js.org/) (Google Provider)

---

## 📂 Architecture & Folder Structure

The app follows a modern Next.js App Router architecture, enforcing strict boundaries between Server and Client components.

```text
yeneta/
├── prisma/
│   └── schema.prisma         # Database models (User, Folder, ChatSession, Message)
├── public/                   # Static assets, SVG icons, and creator images
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── about/            # Public About page (Team & Features)
│   │   ├── chat/             # Main authenticated Chat/Study interface
│   │   ├── api/              # Backend endpoints (auth, document, quiz, tts, stt, translate)
│   │   ├── layout.tsx        # Global layout, AuthProvider, and ThemeProvider
│   │   └── page.tsx          # Public Landing Page
│   ├── components/           # Reusable UI components
│   │   ├── ChatWindow.tsx    # Message history and streaming UI
│   │   ├── ChatInput.tsx     # Textarea, voice recording, and file staging
│   │   ├── DocumentUpload.tsx# Drag-and-drop file processing zone
│   │   ├── Sidebar.tsx       # Chat history and folder management
│   │   ├── QuizCard.tsx      # Interactive MCQ quiz UI
│   │   └── ...
│   ├── lib/                  # Core utilities and business logic
│   │   ├── actions.ts        # Prisma Server Actions (DB CRUD)
│   │   ├── gemini.ts         # Gemini AI client initialization
│   │   ├── prompts.ts        # System instructions and localized AI prompts
│   │   └── speech.ts         # STT/TTS browser audio handlers
│   └── types/                # TypeScript interfaces
└── package.json
```

---

## ⚙️ Installation & Setup

### 1. Clone the repository
```bash
git clone https://github.com/0xTeme/yeneta.git
cd yeneta
```

### 2. Install dependencies
```bash
npm install
# or yarn install / pnpm install
```

### 3. Set up Environment Variables
Create a `.env.local` file in the root directory and add the following keys:

```env
# Database
DATABASE_URL="postgresql://user:password@your-neon-host.com/dbname?sslmode=require"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-a-random-secure-string-here"

# Google OAuth (For User Sign-in)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Google Gemini AI
GOOGLE_API_KEY="your-gemini-api-key"
```

### 4. Initialize the Database
Push the Prisma schema to your PostgreSQL database to create the necessary tables:
```bash
npx prisma db push
```

### 5. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## 🚀 Usage

1. **Sign In**: Navigate to the home page and click "Sign in with Google".
2. **Personalize**: On your first visit, set your Education Level, AI Voice preference, and Gender (for accurate Amharic grammar) in the Settings modal.
3. **Chat**: Type questions in Amharic or English. Use the **Microphone** icon to dictate your questions.
4. **Upload Materials**: Click the **Paperclip** icon to upload a PDF, Word Doc, PowerPoint, or Image.
5. **Process Documents**: Once uploaded, choose to:
   *   **Explain**: Get a breakdown of the document.
   *   **Summarize**: Get key takeaways and summaries.
   *   **Quiz Me**: Generate a 5, 10, or 20-question interactive test.
6. **Organize**: Use the sidebar to create folders and organize your past study sessions.

---

## ⚠️ Notes & Limitations

*   **File Size Limit**: To ensure stability on serverless hosting environments (like Vercel), document uploads are capped at **4MB**.
*   **TTS API**: The Text-to-Speech feature currently utilizes an undocumented Microsoft Edge TTS endpoint (`msedge-tts`) to achieve high-quality Amharic voices. While effective, it requires an active internet connection and may be subject to rate limiting by Microsoft.
*   **Browser Compatibility**: Voice recording dynamically falls back to `.mp4` on Safari/iOS and `.webm` on Chrome/Android. Speech Recognition (Dictation) relies on native browser APIs and works best on Chromium-based browsers.

---

## 👥 The Team: CODE GE'EZ

Yeneta was proudly built by **CODE GE'EZ**, a team dedicated to elevating the modern educational experience through AI.

*   **Temesgen Melaku** — Backend / Database & AI  
    *Focuses On:* API routes, Database architecture, Gemini integration, prompts, and file processing.  
    [GitHub](https://github.com/0xTeme) | [LinkedIn](https://www.linkedin.com/in/temesgen-melaku-walelign)
*   **Fiseha Mengistu** — Frontend / UI-UX  
    *Focuses On:* Interface design, React components, styling, responsiveness, and speech features.  
    [GitHub](https://github.com/fmet1202) | [LinkedIn](https://www.linkedin.com/in/fiseha-mengistu)

---

## 📄 License

This project is proprietary. Please contact the repository owners regarding usage, modification, or distribution rights.
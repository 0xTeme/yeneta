# የኔታ | Yeneta 🎓

> **"Learn Smarter in Your Own Language."**

🔗 **Live Demo**: [https://yeneta-ai.vercel.app/](https://yeneta-ai.vercel.app/)

---

**Yeneta** is an AI-powered, personalized bilingual study assistant built specifically to empower Ethiopian students. It bridges the gap between complex study materials and accessible learning by providing document analysis, smart summaries, interactive quizzes, and voice-assisted tutoring in both **Amharic** and **English**.

Built with ❤️ by **[CODE GE'EZ](https://github.com/0xTeme)**

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🤖 **AI Chat Tutor** | Context-aware conversational AI powered by Google's Gemini 1.5 Flash, tailored to education level |
| 🌍 **Bilingual Support** | Seamlessly chat, learn, and translate between Amharic and English |
| 📄 **Document Analysis** | Upload PDFs, Word docs, PowerPoints, TXT files, and Images |
| 📝 **Quiz Generation** | Auto-generate 5, 10, or 20-question quizzes from your materials |
| 🗣️ **Voice Enabled** | Text-to-Speech & Speech-to-Text with natural Amharic/English voices |
| 🗂️ **Cloud Sync** | Chat history and folders saved automatically |
| 🎨 **Beautiful UI** | Dark/Light mode, Markdown & Math (KaTeX) support |
| 🔐 **Secure Auth** | One-click Google OAuth sign-in |

---

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/0xTeme/yeneta.git
cd yeneta

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local  # Edit with your keys

# Initialize database
npx prisma db push

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | Next.js 15, React 19, Tailwind CSS v4, Lucide Icons |
| **Backend** | Next.js Server Actions & API Routes, Prisma ORM |
| **Database** | PostgreSQL (Neon) |
| **AI** | Google Gemini API, Microsoft Edge TTS |
| **Auth** | NextAuth.js (Google OAuth) |

---

## 📁 Project Structure

```
yeneta/
├── prisma/
│   └── schema.prisma         # Database models
├── public/                   # Static assets, icons
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── chat/            # Main chat interface
│   │   ├── about/           # About page
│   │   ├── api/             # API routes
│   │   └── page.tsx         # Landing page
│   ├── components/          # React components
│   │   ├── ChatWindow.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── Sidebar.tsx
│   │   └── ...
│   ├── lib/                 # Utilities
│   │   ├── actions.ts       # DB operations
│   │   ├── gemini.ts        # AI client
│   │   ├── prompts.ts       # AI prompts
│   │   └── speech.ts        # STT/TTS
│   └── types/               # TypeScript types
└── package.json
```

---

## ⚙️ Environment Setup

Create a `.env.local` file with these variables:

```env
# Database (PostgreSQL)
DATABASE_URL="postgresql://user:password@host/db?sslmode=require"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# Google OAuth
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"

# Google Gemini AI
GOOGLE_API_KEY="your-api-key"
```

---

## 📖 Usage Guide

1. **Sign In** → Click "Sign in with Google"
2. **Set Profile** → Choose education level, AI voice, and gender
3. **Chat** → Type or speak questions in Amharic or English
4. **Upload** → Click 📎 to upload PDFs, docs, or images
5. **Process** → Choose to Explain, Summarize, or Quiz
6. **Organize** → Create folders to manage your sessions

---

## ⚠️ Limitations

- **File Size**: Max 4MB per upload (Vercel serverless limit)
- **TTS**: Uses Microsoft Edge TTS endpoint; requires internet
- **Browser**: Best experience on Chromium-based browsers (Chrome, Edge)

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 👥 Team

| Member | Role | Links |
|--------|------|-------|
| **Temesgen Melaku** | Backend / Database & AI | [GitHub](https://github.com/0xTeme) · [LinkedIn](https://linkedin.com/in/temesgen-melaku-walelign) |
| **Fiseha Mengistu** | Frontend / UI-UX | [GitHub](https://github.com/fmet1202) · [LinkedIn](https://linkedin.com/in/fiseha-mengistu) |

---

## 📄 License

Proprietary. Contact the repository owners for usage, modification, or distribution rights.

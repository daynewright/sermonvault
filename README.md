# SermonVault

SermonVault is a modern web application that helps manage and analyze sermon content using AI. Built with Next.js and powered by Supabase and OpenAI.

## Features

- 🔐 Google Authentication via Supabase
- 📝 Sermon content management and storage
- 🤖 AI-powered sermon analysis and insights
- 💻 Modern, responsive interface built with Tailwind CSS
- 🌐 Full-text search capabilities
- 📱 Mobile-friendly design

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Database & Auth**: Supabase
- **AI Integration**: OpenAI
- **Styling**: Tailwind CSS + Shadcn UI
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase account
- An OpenAI API key
- A Google Cloud Project (for authentication)

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
```

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/sermonvault.git
```

2. Install dependencies:

```bash
npm install
```

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Deployment

The application is deployed on Vercel. You can visit the live site at [https://sermonvault.vercel.app](https://sermonvault.vercel.app)

To deploy your own instance:

1. Fork this repository
2. Create a new project on Vercel
3. Connect your fork to Vercel
4. Configure the environment variables
5. Deploy!

## Screenshots

![Dashboard View](/images/landing_page.png)
_Main landing page_

![Chat Interface](/images/chat.png)
_AI-powered chat interface_

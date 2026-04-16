# MACS Assistant

A McDonald's FAQ email drafter that helps customer service officers generate contextual email responses using relevant FAQ data and past replies. Features a Notion-like rich text editor, semantic document retrieval via pgVector, and geospatial visualization of customer inquiries.

## Features

- **AI Email Drafting** - Generates contextual draft responses using Google Gemini, referencing relevant FAQ chunks and similar past replies
- **Semantic Search** - pgVector-powered 153-dimensional embeddings for FAQ chunk retrieval with cosine similarity matching
- **Rich Text Editor** - [Novel](https://github.com/steven-tey/novel)-based Notion-like editor with AI-assisted writing (continue, improve, shorten, lengthen, fix grammar)
- **Document Sidebar** - Browse related FAQ documents, related emails, and house rules in a collapsible right panel
- **Headlines & Trends** - AI-generated topic modeling and trend analysis across customer feedback using LDA/NMF approaches
- **Evergreen Topics** - Tracks recurring themes (Food Information, Delivery Orders, Promotions, etc.) with sentiment analysis
- **Geospatial View** - H3 hexagonal heatmap visualization of inquiry locations using Leaflet and D3
- **Record Management** - Full CRUD for customer inquiry records with category, subcategory, outcome tracking, and CSV bulk import

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 16](https://nextjs.org) (App Router, React 19) |
| AI | [Vercel AI SDK v6](https://sdk.vercel.ai/docs) with Google Gemini Flash 2.5 |
| Database | PostgreSQL ([Neon](https://neon.tech)) with [pgVector](https://github.com/pgvector/pgvector) |
| ORM | [Drizzle ORM](https://orm.drizzle.team) |
| Auth | [NextAuth.js v5](https://authjs.dev) (Credentials provider, bcrypt) |
| UI | [shadcn/ui](https://ui.shadcn.com) + [Radix UI](https://radix-ui.com) + [Tailwind CSS v4](https://tailwindcss.com) |
| Editor | [Novel](https://novel.sh) (TipTap + ProseMirror) |
| Maps | [Leaflet](https://leafletjs.com) + [H3](https://h3geo.org) + [D3](https://d3js.org) |
| Linting | [Biome](https://biomejs.dev) |

## Project Structure

```
app/
  (auth)/                 # Login, registration, NextAuth config
  (record)/               # Main app (protected)
    page.tsx              # Dashboard
    record/[id]/page.tsx  # Individual record view
    api/
      records/            # Record CRUD + summary generation
      editor/             # Draft save/generate
      ask-ai/             # AI writing assistant (continue, improve, etc.)
      document/           # FAQ chunk & related email retrieval
      headlines/          # Trend analysis
      summary/            # Batch summary + topic extraction
      csv-chunks/         # CSV FAQ import
  (OneMap)/               # Geospatial map view

lib/
  ai/                     # AI provider config, embeddings, house rules
  db/
    schema.ts             # Drizzle schema (User, Record, faqChunks, Headlines, Preferences)
    queries.ts            # Database operations
    migrations/           # SQL migration files
  editor/                 # Editor content utilities

components/
  sidebars/               # Left nav, right documents bar, record shell
  editor/                 # Novel editor setup
  generative/             # AI selector UI
  ui/                     # shadcn/ui primitives
```

## Getting Started

### Prerequisites

- Node.js 18+
- [pnpm](https://pnpm.io)
- PostgreSQL with pgVector extension (or a [Neon](https://neon.tech) database)

### Environment Variables

Create a `.env.local` file:

```env
# Required
POSTGRES_URL=postgresql://...
NEXTAUTH_SECRET=your-secret-here
GOOGLE_GENERATIVE_AI_API_KEY=your-google-ai-key

# Optional (for rate limiting)
KV_REST_API_URL=your-upstash-redis-url
KV_REST_API_TOKEN=your-upstash-redis-token
```

### Install & Run

```bash
pnpm install
pnpm db:migrate    # Run database migrations
pnpm dev           # Start dev server
```

The app runs on [localhost:3000](http://localhost:3000/).

### Database Commands

```bash
pnpm db:generate   # Generate migration files from schema changes
pnpm db:migrate    # Apply pending migrations
pnpm db:push       # Push schema directly (dev only)
pnpm db:studio     # Open Drizzle Studio GUI
```

## Model Providers

The default provider is Google Gemini Flash 2.5. The AI provider is configured in `lib/ai/index.ts` and uses the [Vercel AI SDK](https://sdk.vercel.ai/docs), so you can swap to [OpenAI](https://openai.com), [Anthropic](https://anthropic.com), or [any supported provider](https://sdk.vercel.ai/providers/ai-sdk-providers) by changing a few lines.

## Limitations

- The deployed version uses Gemini Flash 2.5 as the default model. For full AI capabilities, you need your own API keys.
- FAQ chunks have been pre-embedded and ingested. Uploading new CSVs requires:
  1. The CSV in the expected format
  2. A valid API key for embedding generation

## Credits

Based on the work by Greg at [Rabbit Hole Syndrome](https://www.youtube.com/@RabbitHoleSyndrome) ([@ggrdson](https://twitter.com/ggrdson)):

- Built on Vercel's [Next.js OpenAI Doc Search Template](https://vercel.com/templates/next.js/nextjs-openai-doc-search-starter)
- [ChatGPT for the Supabase Docs](https://supabase.com/blog/chatgpt-supabase-docs) blog post
- [pgvector: Embeddings and vector similarity](https://supabase.com/docs/guides/database/extensions/pgvector)
- Editor powered by [Novel](https://github.com/steven-tey/novel)

Frontend library created by [Vercel](https://vercel.com) and [Next.js](https://nextjs.org) team members including Jared Palmer, Shu Ding, and shadcn.

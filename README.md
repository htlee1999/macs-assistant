# macs-assistant
The motivation behind this macdonald's FAQ drafter is that sometimes people can send lots of questions and lots of emails, we want to create a drafter that would help you generate appropriate response with relevant data. You can also edit using a Notion-like editor called Novel.

- For the purpose of deployment only a default base model utilising Gemini flash 2.0 would be utilised when creating a draft.
- The chunks that are used as relevant context has already been embedded and ingested 
- For full AI capabilities of the web app you would require your own API keys and you would need to use it either locally or deploy on your own. 
- As such you would not be able to upload CSV file for 2 reasons
  1. The CSV file need to be in a specific format
  2. You need an API key to do embedding of the chunks


## Features

- [Next.js](https://nextjs.org) App Router
  - Advanced routing for seamless navigation and performance
  - React Server Components (RSCs) and Server Actions for server-side rendering and increased performance
- [AI SDK](https://sdk.vercel.ai/docs)
  - Unified API for generating text, structured objects, and tool calls with LLMs
  - Supports OpenAI (default), Anthropic, Cohere, and other model providers
- [shadcn/ui](https://ui.shadcn.com)
  - Styling with [Tailwind CSS](https://tailwindcss.com)
  - Component primitives from [Radix UI](https://radix-ui.com) for accessibility and flexibility
- Data Persistence
  - [Vercel Postgres powered by Neon](https://vercel.com/storage/postgres) for saving chat history and user data
  - [Vercel Blob](https://vercel.com/storage/blob) for efficient file storage
- [NextAuth.js](https://github.com/nextauthjs/next-auth)
  - Simple and secure authentication

## Model Providers

This template ships with Google's `gemini flash 2.0` as the default. However, with the [AI SDK](https://sdk.vercel.ai/docs), you can switch LLM providers to [OpenAI](https://openai.com), [Anthropic](https://anthropic.com), [Cohere](https://cohere.com/), and [many more](https://sdk.vercel.ai/providers/ai-sdk-providers) with just a few lines of code.


## Running locally

You will need to use the environment variables [defined in `.env.example`](.env.example) to run Next.js AI Chatbot. It's recommended you use [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables) for this, but a `.env` file is all that is necessary.

> Note: You should not commit your `.env` file or it will expose secrets that will allow others to control access to your various OpenAI and authentication provider accounts.

1. Install Vercel CLI: `npm i -g vercel`
2. Link local instance with Vercel and GitHub accounts (creates `.vercel` directory): `vercel link`
3. Download your environment variables: `vercel env pull`

```bash
pnpm install
pnpm dev
```

Your app template should now be running on [localhost:8000](http://localhost:8000/).

## Credits

We based our solution off the fantastic work done by Greg over at [Rabbit Hole Syndrome](https://www.youtube.com/@RabbitHoleSyndrome). You can follow his work on Twitter at [@ggrdson](https://twitter.com/ggrdson).

- This prototype was built using Vercel's very robust [Next.js OpenAI Doc Search Template](https://vercel.com/templates/next.js/nextjs-openai-doc-search-starter)
- Read the blogpost on how he built [ChatGPT for the Supabase Docs](https://supabase.com/blog/chatgpt-supabase-docs).
- [[Docs] pgvector: Embeddings and vector similarity](https://supabase.com/docs/guides/database/extensions/pgvector)
- Watch [Greg's](https://twitter.com/ggrdson) "How I built this" [video](https://youtu.be/Yhtjd7yGGGA) on the [Rabbit Hole Syndrome YouTube Channel](https://www.youtube.com/@RabbitHoleSyndrome).
- The editing function of the app comes from Novel (https://github.com/steven-tey/novel/blob/main/README.md)

The frontend library used in this Beta is created by [Vercel](https://vercel.com) and [Next.js](https://nextjs.org) team members, with contributions from:

- Jared Palmer ([@jaredpalmer](https://twitter.com/jaredpalmer)) - [Vercel](https://vercel.com)
- Shu Ding ([@shuding\_](https://twitter.com/shuding_)) - [Vercel](https://vercel.com)
- shadcn ([@shadcn](https://twitter.com/shadcn)) - [Vercel](https://vercel.com)

 

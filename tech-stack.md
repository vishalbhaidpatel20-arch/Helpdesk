## Tech Stack

# Frontend
React with TypeScript
Tailwind CSS
React Router
# Backend
Node.js with Express and TypeScript
Database sessions for authentication
# Database
PostgreSQL
# ORM
Prisma
# AI
Google Gemini via the Vercel AI SDK for ticket classification, summaries, reply polishing and auto-resolve
# Email
Inbound: JSON webhook (provider adapters for SendGrid/Mailgun not built yet), built-in SMTP server, or IMAP polling
Outbound replies: nodemailer over SMTP (e.g. Gmail)
# Background jobs
pg-boss (Postgres-backed queue); on Vercel, jobs run with waitUntil
# Deployment
Vercel (client on the CDN, API as a Vercel Function on the Bun runtime) + hosted PostgreSQL
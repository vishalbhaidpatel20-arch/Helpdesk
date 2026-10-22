import { useQuery } from '@tanstack/react-query'
import {
  BarChart3Icon,
  BotIcon,
  MailIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TagsIcon,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { authClient } from '@/lib/auth-client'

const features: { icon: LucideIcon; color: string; title: string; description: string }[] = [
  {
    icon: MailIcon,
    color: 'from-sky-500 to-blue-500',
    title: 'Email becomes tickets',
    description: 'Support emails arrive by IMAP, SMTP or webhook and turn into tickets automatically, with no duplicates.',
  },
  {
    icon: TagsIcon,
    color: 'from-violet-500 to-purple-500',
    title: 'Smart classification',
    description: 'Claude sorts every ticket into General Question, Technical Question or Refund Request.',
  },
  {
    icon: BotIcon,
    color: 'from-indigo-500 to-violet-500',
    title: 'Auto-resolve from your knowledge base',
    description: 'Common questions are answered instantly from your docs, and anything risky is escalated to a person.',
  },
  {
    icon: SparklesIcon,
    color: 'from-amber-400 to-orange-500',
    title: 'Summaries and polished replies',
    description: 'Summarize a long thread in one click and let AI polish your draft before you send it.',
  },
  {
    icon: BarChart3Icon,
    color: 'from-emerald-500 to-teal-500',
    title: 'Live dashboard',
    description: 'Track open tickets, AI resolution rate, average resolution time and daily volume at a glance.',
  },
  {
    icon: ShieldCheckIcon,
    color: 'from-rose-500 to-pink-500',
    title: 'Teams and roles',
    description: 'Admins manage agents, agents work the queue, and every sign-in is protected by secure sessions.',
  },
]

const steps = [
  { title: 'A customer emails you', description: 'The message is saved as a ticket in seconds.' },
  { title: 'AI does the first pass', description: 'It categorizes the ticket and answers it when the knowledge base covers it.' },
  { title: 'Your team handles the rest', description: 'Agents get a clean queue with summaries, filters and suggested replies.' },
]

export default function HomePage() {
  const { data: session } = authClient.useSession()
  const { data, isPending, isError } = useQuery({
    queryKey: ['health'],
    queryFn: async ({ signal }) => (await api.get<{ status: string }>('/health', { signal })).data.status,
  })
  const firstName = session?.user.name.split(' ')[0]

  return (
    <main>
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-indigo-50 via-white to-white">
        <div aria-hidden className="absolute -top-32 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-indigo-300/30 blur-3xl" />
        <div aria-hidden className="absolute top-20 -right-24 size-80 rounded-full bg-violet-300/30 blur-3xl" />
        <div aria-hidden className="absolute top-40 -left-24 size-72 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 sm:px-8 sm:py-20 lg:grid-cols-2">
          <div className="text-center lg:text-left">
            <p className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/80 px-4 py-1.5 text-sm font-medium text-indigo-700 shadow-sm backdrop-blur">
              <SparklesIcon className="size-4" aria-hidden />
              AI-powered ticket management
            </p>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">
              Welcome home
              <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                {firstName ? `, ${firstName}` : ''}
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-slate-600 lg:mx-0">
              Turn support emails into organized tickets, let Claude answer the easy ones, and give your team more time
              for the customers who need a human.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Button
                asChild
                size="lg"
                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/40 sm:w-auto"
              >
                <Link to="/tickets">View tickets</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full bg-white/80 sm:w-auto">
                <Link to="/dashboard">Open dashboard</Link>
              </Button>
            </div>
            <div className="mt-8 inline-flex items-center gap-2 text-sm text-slate-500" aria-busy={isPending}>
              <span>API status:</span>
              {isPending ? (
                <Skeleton className="h-4 w-16" />
              ) : (
                <span className="inline-flex items-center gap-1.5 font-medium text-slate-900">
                  <span aria-hidden className={`size-2 rounded-full ${isError ? 'bg-red-500' : 'bg-emerald-500'}`} />
                  {isError ? 'unreachable' : data}
                </span>
              )}
            </div>
          </div>

          {/* Decorative preview of a ticket being handled by the AI */}
          <div aria-hidden className="relative mx-auto w-full max-w-md">
            <div className="rounded-2xl border bg-white p-5 shadow-2xl shadow-indigo-500/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase">Ticket #1042</span>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">Resolved</span>
              </div>
              <p className="mt-3 font-semibold text-slate-900">How do I reset my password?</p>
              <p className="mt-1 text-sm text-slate-500">From: Sam Rivera</p>
              <div className="mt-4 rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 p-4">
                <p className="flex items-center gap-2 text-xs font-semibold text-indigo-700">
                  <BotIcon className="size-4" />
                  AI Assistant replied
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  Hi Sam, open Settings, choose Security and click Reset password. We just emailed you the link.
                </p>
              </div>
            </div>
            <div className="absolute -bottom-5 -left-4 rounded-xl border bg-white px-4 py-3 shadow-lg sm:-left-8">
              <p className="text-xs text-slate-500">Resolved by AI</p>
              <p className="text-xl font-bold text-slate-900">68%</p>
            </div>
            <div className="absolute -top-4 -right-2 rounded-full border bg-white px-3 py-1.5 text-xs font-medium text-violet-700 shadow-lg sm:-right-6">
              Technical Question
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="features-heading" className="mx-auto max-w-7xl px-4 py-16 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="features-heading" className="text-3xl font-bold tracking-tight">
            Everything your support team needs
          </h2>
          <p className="mt-3 text-muted-foreground">One place to receive, understand and answer customer requests.</p>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, color, title, description }) => (
            <Card key={title} className="transition-all hover:-translate-y-1 hover:shadow-lg">
              <CardHeader>
                <span className={`mb-2 flex size-11 items-center justify-center rounded-xl bg-gradient-to-br ${color} text-white shadow-sm`}>
                  <Icon className="size-5" aria-hidden />
                </span>
                <CardTitle className="text-lg">{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm leading-relaxed">{description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="how-heading" className="border-y bg-background">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-8">
          <h2 id="how-heading" className="text-center text-3xl font-bold tracking-tight">
            How it works
          </h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title} className="flex gap-4 md:flex-col md:items-center md:text-center">
                <span
                  aria-hidden
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary"
                >
                  {index + 1}
                </span>
                <div>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-8">
        <div className="rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 px-6 py-12 text-center text-white shadow-xl shadow-indigo-500/20 sm:px-12">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Ready to clear your queue?</h2>
          <p className="mx-auto mt-3 max-w-xl text-indigo-100">
            Jump into the ticket list and see what the AI has already handled for you today.
          </p>
          <Button asChild size="lg" className="mt-6 bg-white text-indigo-700 hover:bg-indigo-50">
            <Link to="/tickets">Go to tickets</Link>
          </Button>
        </div>
      </section>
    </main>
  )
}

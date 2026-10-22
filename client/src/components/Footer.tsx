import AppLink from '@/components/AppLink'
import Logo from '@/components/Logo'

const year = new Date().getFullYear()

export default function Footer() {
  return (
    <footer className="mt-auto border-t bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="space-y-2">
          <Logo className="text-lg" />
          <p className="max-w-xs text-sm text-muted-foreground">
            AI-powered ticket management: every customer email answered faster.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
          <AppLink to="/">Home</AppLink>
          <AppLink to="/dashboard">Dashboard</AppLink>
          <AppLink to="/tickets">Tickets</AppLink>
        </nav>
      </div>
      <div className="border-t py-4 text-center text-xs text-muted-foreground">
        © {year} Helpdesk. All rights reserved.
      </div>
    </footer>
  )
}

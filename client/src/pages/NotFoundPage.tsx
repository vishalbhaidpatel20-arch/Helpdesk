import AppLink from '@/components/AppLink'

// Shown for any URL that matches no route, instead of an empty page
export default function NotFoundPage() {
  return (
    <main className="mx-auto w-full max-w-5xl p-4 sm:p-8">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Page not found</h1>
      <p className="mt-2 text-muted-foreground">The page you are looking for doesn't exist or has moved.</p>
      <AppLink to="/" className="mt-4 inline-block">
        Go to the home page
      </AppLink>
    </main>
  )
}

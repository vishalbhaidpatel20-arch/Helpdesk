import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Navigate, useNavigate } from 'react-router'
import { z } from 'zod'
import { authClient } from '../lib/auth-client'

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').pipe(z.email('Enter a valid email address')),
  password: z.string().min(1, 'Password is required'),
})

type LoginValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const navigate = useNavigate()
  const { data: session, isPending } = authClient.useSession()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })

  if (isPending) return null
  if (session) return <Navigate to="/" replace />

  async function onSubmit(values: LoginValues) {
    const { error } = await authClient.signIn.email(values)
    if (error) {
      setError('root', { message: error.message || 'Unable to sign in' })
      return
    }
    navigate('/', { replace: true })
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="w-full max-w-sm space-y-4 rounded-lg bg-white p-8 shadow"
      >
        <div>
          <h1 className="text-2xl font-bold">Helpdesk</h1>
          <p className="mt-1 text-sm text-gray-600">Sign in to your account</p>
        </div>

        {errors.root && (
          <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            {errors.root.message}
          </p>
        )}

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Email</span>
          <input
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            {...register('email')}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 aria-invalid:border-red-500"
          />
          {errors.email && <span className="mt-1 block text-sm text-red-600">{errors.email.message}</span>}
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Password</span>
          <input
            type="password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            {...register('password')}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 aria-invalid:border-red-500"
          />
          {errors.password && (
            <span className="mt-1 block text-sm text-red-600">{errors.password.message}</span>
          )}
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </main>
  )
}

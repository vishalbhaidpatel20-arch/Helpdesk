import { expect, test } from '@playwright/test'
import { ADMIN } from './helpers/users'

const origin = 'http://localhost:5174'

test.describe('auth API', () => {
  test('get-session without a cookie returns no session', async ({ request }) => {
    const res = await request.get('/api/auth/get-session')
    expect(res.ok()).toBe(true)
    expect(await res.json()).toBeNull()
  })

  test('get-session with a garbage cookie returns no session', async ({ request }) => {
    const res = await request.get('/api/auth/get-session', {
      headers: { cookie: 'better-auth.session_token=garbage.value' },
    })
    expect(await res.json()).toBeNull()
  })

  test('public sign-up is rejected and creates no user', async ({ request }) => {
    const email = `intruder-${Date.now()}@test.example`
    const res = await request.post('/api/auth/sign-up/email', {
      headers: { origin },
      data: { email, password: 'intruder-password-123', name: 'Intruder' },
    })
    expect(res.ok()).toBe(false)
    expect(res.status()).toBeGreaterThanOrEqual(400)

    const signIn = await request.post('/api/auth/sign-in/email', {
      headers: { origin },
      data: { email, password: 'intruder-password-123' },
    })
    expect(signIn.ok()).toBe(false)
  })

  test('sign-up with role ADMIN cannot create an admin', async ({ request }) => {
    const email = `escalate-${Date.now()}@test.example`
    const res = await request.post('/api/auth/sign-up/email', {
      headers: { origin },
      data: { email, password: 'escalate-password-123', name: 'Escalate', role: 'ADMIN' },
    })
    expect(res.ok()).toBe(false)
    const signIn = await request.post('/api/auth/sign-in/email', {
      headers: { origin },
      data: { email, password: 'escalate-password-123' },
    })
    expect(signIn.ok()).toBe(false)
  })

  test('sign-in with a bad origin is rejected', async ({ request }) => {
    const res = await request.post('/api/auth/sign-in/email', {
      headers: { origin: 'http://evil.example' },
      data: { email: ADMIN.email, password: ADMIN.password },
    })
    expect(res.status()).toBe(403)
    expect(res.headers()['set-cookie']).toBeUndefined()
  })

  test('sign-in with valid credentials works with the trusted origin', async ({ request }) => {
    const res = await request.post('/api/auth/sign-in/email', {
      headers: { origin },
      data: { email: ADMIN.email, password: ADMIN.password },
    })
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(body.user.email).toBe(ADMIN.email)
    expect(body.user.role).toBe('ADMIN')
  })

  test('wrong password returns 401 with no session cookie', async ({ request }) => {
    const res = await request.post('/api/auth/sign-in/email', {
      headers: { origin },
      data: { email: ADMIN.email, password: 'wrong-password-123456' },
    })
    expect(res.status()).toBe(401)
    expect(res.headers()['set-cookie']).toBeUndefined()
  })

  test('unknown email and wrong password give the same status and body', async ({ request }) => {
    const a = await request.post('/api/auth/sign-in/email', {
      headers: { origin },
      data: { email: 'nobody@test.example', password: 'wrong-password-123456' },
    })
    const b = await request.post('/api/auth/sign-in/email', {
      headers: { origin },
      data: { email: ADMIN.email, password: 'wrong-password-123456' },
    })
    expect(a.status()).toBe(b.status())
    expect(await a.json()).toEqual(await b.json())
  })

  test('a role field in a sign-in body does not change the session role', async ({ request }) => {
    const res = await request.post('/api/auth/sign-in/email', {
      headers: { origin },
      data: { email: ADMIN.email, password: ADMIN.password, role: 'AGENT' },
    })
    expect(res.ok()).toBe(true)
    const session = await (await request.get('/api/auth/get-session')).json()
    expect(session.user.role).toBe('ADMIN')
  })

  test('a user cannot change their own role through update-user', async ({ request }) => {
    const signIn = await request.post('/api/auth/sign-in/email', {
      headers: { origin },
      data: { email: ADMIN.email, password: ADMIN.password },
    })
    expect(signIn.ok()).toBe(true)
    // Rejected or silently ignored, the role must be unchanged
    await request.post('/api/auth/update-user', { headers: { origin }, data: { role: 'AGENT', name: 'Admin' } })
    const session = await (await request.get('/api/auth/get-session')).json()
    expect(session.user.role).toBe('ADMIN')
  })

  test('sign-out API invalidates the session', async ({ request }) => {
    await request.post('/api/auth/sign-in/email', {
      headers: { origin },
      data: { email: ADMIN.email, password: ADMIN.password },
    })
    expect(await (await request.get('/api/auth/get-session')).json()).not.toBeNull()
    const out = await request.post('/api/auth/sign-out', { headers: { origin }, data: {} })
    expect(out.ok()).toBe(true)
    expect(await (await request.get('/api/auth/get-session')).json()).toBeNull()
  })

  test('sign-in response sets an HttpOnly session cookie', async ({ request }) => {
    const res = await request.post('/api/auth/sign-in/email', {
      headers: { origin },
      data: { email: ADMIN.email, password: ADMIN.password },
    })
    const setCookie = res.headers()['set-cookie']
    expect(setCookie).toMatch(/session_token/)
    expect(setCookie).toMatch(/HttpOnly/i)
  })
})

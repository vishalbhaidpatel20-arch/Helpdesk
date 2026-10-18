import { useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'

function Home() {
  const [status, setStatus] = useState('checking...')

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data: { status: string }) => setStatus(data.status))
      .catch(() => setStatus('unreachable'))
  }, [])

  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-3xl font-bold">Helpdesk</h1>
      <p className="mt-2 text-gray-600">API status: {status}</p>
    </main>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </BrowserRouter>
  )
}

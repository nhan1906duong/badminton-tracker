import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-svh bg-surface">
        <header className="bg-primary text-white p-4 shadow-md">
          <h1 className="text-xl font-semibold">Badminton Match Tracker</h1>
        </header>
        <main className="p-4">
          <p className="text-gray-600">App initialized. Build out pages here.</p>
        </main>
      </div>
    </QueryClientProvider>
  )
}

export default App

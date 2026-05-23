import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Verify from './pages/Verify';
import AITools from './pages/AITools';
import PublicVerify from './pages/PublicVerify';

function App() {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-primary rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

      <Navbar />
      
      <main className="flex-grow z-10">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/verify/public/:hash" element={<PublicVerify />} />
          <Route path="/ai-tools" element={<AITools />} />
        </Routes>
      </main>

      <Footer />
      <Toaster position="bottom-right" toastOptions={{
        style: {
          background: '#111827',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)',
        }
      }} />
    </div>
  );
}

export default App;

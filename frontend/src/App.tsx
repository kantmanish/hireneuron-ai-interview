import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { BrainCircuit } from 'lucide-react';
import { RecruiterSetupPage } from './pages/RecruiterSetupPage';
import { CandidateInterviewPage } from './pages/CandidateInterviewPage';
import { RecruiterReportPage } from './pages/RecruiterReportPage';
import { SecondaryCameraPage } from './pages/SecondaryCameraPage';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5 font-bold text-lg text-slate-900">
              <div className="p-2 rounded-lg bg-indigo-600 text-white">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <span>HireNeuron</span>
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                AI Interview & Proctoring MVP
              </span>
            </Link>

            <nav className="flex items-center gap-4 text-sm font-medium text-slate-600">
              <Link to="/" className="hover:text-indigo-600 transition">
                Recruiter Setup
              </Link>
              <Link to="/interview/demo-session" className="hover:text-indigo-600 transition">
                Candidate Demo
              </Link>
              <Link to="/report/demo-session" className="hover:text-indigo-600 transition">
                Sample Report
              </Link>
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<RecruiterSetupPage />} />
            <Route path="/interview/:id" element={<CandidateInterviewPage />} />
            <Route path="/report/:id" element={<RecruiterReportPage />} />
            <Route path="/secondary-camera" element={<SecondaryCameraPage />}/>
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
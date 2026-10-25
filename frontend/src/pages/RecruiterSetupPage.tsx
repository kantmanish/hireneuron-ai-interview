import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Upload, Sparkles, Copy, CheckCircle2, ArrowRight, FileText } from 'lucide-react';
import { api } from '../api/client';
import type { Interview, Question } from '../types';

export const RecruiterSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const [jobTitle, setJobTitle] = useState('Full Stack Software Engineer');
  const [jobDescription, setJobDescription] = useState(
    'We are looking for an engineer experienced in React, TypeScript, and Python FastAPI to build scalable web applications and AI integrations.'
  );
  const [skillsInput, setSkillsInput] = useState('React, TypeScript, FastAPI, SQLite, REST APIs');
  const [experienceLevel, setExperienceLevel] = useState('Mid-Level');
  const [questionLimit, setQuestionLimit] = useState(10);
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const [loadingStep, setLoadingStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createdInterview, setCreatedInterview] = useState<Interview | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [copied, setCopied] = useState(false);

  const handleCreateAndGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setLoadingStep('Creating interview configuration...');
      const skills = skillsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const interview = await api.createInterview({
        job_title: jobTitle,
        job_description: jobDescription,
        required_skills: skills,
        experience_level: experienceLevel,
        question_limit: questionLimit,
        duration_minutes: 30,
      });

      if (resumeFile) {
        setLoadingStep('Uploading & extracting resume text...');
        await api.uploadResume(interview.id, resumeFile);
      }

      setLoadingStep(`Generating ${questionLimit} structured AI interview questions...`);
      const generatedQuestions = await api.generateQuestions(interview.id, questionLimit);

      setCreatedInterview(interview);
      setQuestions(generatedQuestions);
    } catch (err: any) {
      setError(err?.message || 'Failed to setup interview. Check backend connection.');
    } finally {
      setLoadingStep(null);
    }
  };

  const candidateUrl = createdInterview
    ? `${window.location.origin}/interview/${createdInterview.id}`
    : '';

  const copyLink = () => {
    if (!candidateUrl) return;
    navigator.clipboard.writeText(candidateUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="mb-8">
        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 mb-2">
          MODULE A, B & C • RECRUITER WORKFLOW
        </span>
        <h1 className="text-3xl font-bold text-slate-900">Configure AI Interview Session</h1>
        <p className="text-slate-600 mt-1">
          Enter job requirements, upload the candidate resume, and generate structured evaluation questions.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Form */}
        <form
          onSubmit={handleCreateAndGenerate}
          className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Job Title *</label>
            <div className="relative">
              <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Job Description *</label>
            <textarea
              rows={4}
              required
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Required Skills (comma-separated) *
              </label>
              <input
                type="text"
                required
                value={skillsInput}
                onChange={(e) => setSkillsInput(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Experience Level</label>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="Junior">Junior (0-2 yrs)</option>
                <option value="Mid-Level">Mid-Level (2-5 yrs)</option>
                <option value="Senior">Senior (5+ yrs)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Number of Questions (Default: 10)
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={questionLimit}
                onChange={(e) => setQuestionLimit(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Candidate Resume (PDF / DOCX)
              </label>
              <label className="flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-slate-300 rounded-lg text-sm text-slate-600 cursor-pointer hover:bg-slate-50">
                <Upload className="w-4 h-4 text-indigo-600" />
                <span className="truncate">
                  {resumeFile ? resumeFile.name : 'Upload PDF/DOCX'}
                </span>
                <input
                  type="file"
                  accept=".pdf,.docx"
                  onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={Boolean(loadingStep)}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium py-2.5 px-4 rounded-lg transition cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            {loadingStep || 'Save & Generate Interview Questions'}
          </button>
        </form>

        {/* Right Preview Panel */}
        <div className="lg:col-span-5 space-y-6">
          {createdInterview ? (
            <div className="bg-white rounded-xl shadow-sm border border-emerald-200 p-6 space-y-4">
              <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-5 h-5" />
                <span>Interview Ready! (ID: {createdInterview.id})</span>
              </div>

              <p className="text-xs text-slate-600">
                Share this unique link with the candidate or launch the candidate view directly for your demo:
              </p>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={candidateUrl}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
                />
                <button
                  type="button"
                  onClick={copyLink}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => navigate(`/interview/${createdInterview.id}`)}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-2.5 px-4 rounded-lg transition cursor-pointer"
                >
                  <span>Open Candidate View</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/report/${createdInterview.id}`)}
                  className="flex items-center justify-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium py-2.5 px-4 rounded-lg transition cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>Report</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500 text-sm">
              Fill out the job configuration and click <strong>Save & Generate</strong> to create the candidate link and preview AI questions.
            </div>
          )}

          {questions.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-sm font-semibold text-slate-800 mb-3">
                Generated Questions ({questions.length})
              </h2>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {questions.map((q) => (
                  <div
                    key={q.id}
                    className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-indigo-700">Q{q.order_index} • {q.skill}</span>
                      <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-medium">
                        {q.difficulty}
                      </span>
                    </div>
                    <p className="text-slate-700 leading-relaxed">{q.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
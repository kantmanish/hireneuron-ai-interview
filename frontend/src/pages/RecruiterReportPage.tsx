
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Award,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  ArrowLeft,
  UserCheck,
} from 'lucide-react';
import { api } from '../api/client';
import type { InterviewReport } from '../types';

export const RecruiterReportPage: React.FC = () => {
  const { id: interviewId = 'demo-interview' } = useParams<{ id: string }>();

  const [report, setReport] = useState<InterviewReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [recruiterDecision, setRecruiterDecision] =
    useState<'PENDING' | 'ADVANCE' | 'HOLD'>('PENDING');

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      try {
        const data = await api.getReport(interviewId);

        // Match the actual FastAPI response structure.
        const raw = data as unknown as {
          session_id?: number | string;
          interview_id?: number | string;
          status?: string;
          average_score?: number | null;
          total_questions?: number;
          answered_questions?: number;
          questions?: Array<{
            question_id: number | string;
            question_text: string;
            question_type?: string;
            difficulty?: string;
            answer_text?: string | null;
            evaluation?: {
              relevance_score?: number;
              correctness_score?: number;
              clarity_score?: number;
              overall_score?: number;
              feedback?: string;
              improvement_suggestions?: string;
            } | null;
          }>;
          incidents?: Array<{
            id: number | string;
            event_type: string;
            description?: string | null;
            timestamp?: string | null;
            duration_seconds?: number;
          }>;
        };

        const normalized = {
          interview: {
            id: raw.session_id ?? interviewId,
            job_title: 'Interview Assessment',
            experience_level: 'N/A',
          },

          overall_score: raw.average_score ?? 0,
          max_overall_score: 10,

          incidents: (raw.incidents ?? []).map((incident) => ({
            id: incident.id,
            event_type: incident.event_type,
            description: incident.description ?? '',
            timestamp: incident.timestamp ?? '',
            duration_seconds: incident.duration_seconds,
          })),

          questions_and_evaluations: (raw.questions ?? []).map(
            (q, index) => {
              const answer =
                q.answer_text == null
                  ? null
                  : {
                      id: `${q.question_id}-answer`,
                      question_id: q.question_id,
                      transcript: q.answer_text,
                      status: 'SUBMITTED',
                      submitted_at: '',
                    };

              const evaluation = q.evaluation
                ? {
                    answer_id: answer?.id ?? '',
                    score: q.evaluation.overall_score ?? 0,
                    max_score: 10,
                    explanation: q.evaluation.feedback ?? '',
                    evidence: q.answer_text ?? '',
                    strengths: [
                      `Relevance score: ${q.evaluation.relevance_score ?? 0}`,
                      `Correctness score: ${q.evaluation.correctness_score ?? 0}`,
                      `Clarity score: ${q.evaluation.clarity_score ?? 0}`,
                    ],
                    gaps: q.evaluation.improvement_suggestions
                      ? [q.evaluation.improvement_suggestions]
                      : [],
                  }
                : null;

              return {
                question: {
                  id: q.question_id,
                  text: q.question_text,
                  order_index: index + 1,
                  skill: q.question_type ?? 'General',
                  difficulty: q.difficulty ?? 'medium',
                },
                answer,
                evaluation,
              };
            }
          ),
        } as unknown as InterviewReport;

        if (!cancelled) {
          setReport(normalized);
        }
      } catch (error) {
        console.error('Failed to load interview report:', error);

        if (!cancelled) {
          setReport(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    setLoading(true);
    loadReport();

    return () => {
      cancelled = true;
    };
  }, [interviewId]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-12 px-4 text-center text-slate-600">
        Loading interview assessment report...
      </div>
    );
  }

  if (!report) {
    return (
      <div className="max-w-5xl mx-auto py-12 px-4 text-center text-red-600">
        Report not found. Check the session ID and try again.
      </div>
    );
  }

  const answeredCount = report.questions_and_evaluations.filter(
    (q) => q.answer !== null
  ).length;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Recruiter Setup
          </Link>

          <h1 className="text-3xl font-bold text-slate-900">
            Candidate Assessment Report
          </h1>

          <p className="text-sm text-slate-600">
            Role: <strong>{report.interview.job_title}</strong> (
            {report.interview.experience_level}) • Session ID:{' '}
            {report.interview.id}
          </p>
        </div>

        {/* Recruiter Decision */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-indigo-600" />

          <span className="text-xs font-semibold text-slate-700">
            Recruiter Decision:
          </span>

          <select
            value={recruiterDecision}
            onChange={(e) =>
              setRecruiterDecision(
                e.target.value as 'PENDING' | 'ADVANCE' | 'HOLD'
              )
            }
            className="text-xs font-semibold px-2.5 py-1.5 rounded border border-slate-300 bg-slate-50"
          >
            <option value="PENDING">Pending Human Review</option>
            <option value="ADVANCE">Advance to Next Round</option>
            <option value="HOLD">Hold / Further Assessment</option>
          </select>
        </div>
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-indigo-50 text-indigo-600">
            <Award className="w-6 h-6" />
          </div>

          <div>
            <p className="text-xs text-slate-500 font-medium">
              Overall Rubric Score
            </p>

            <p className="text-2xl font-bold text-slate-900">
              {report.overall_score}{' '}
              <span className="text-sm font-normal text-slate-500">
                / {report.max_overall_score}
              </span>
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
            <FileText className="w-6 h-6" />
          </div>

          <div>
            <p className="text-xs text-slate-500 font-medium">
              Questions Answered
            </p>

            <p className="text-2xl font-bold text-slate-900">
              {answeredCount}{' '}
              <span className="text-sm font-normal text-slate-500">
                / {report.questions_and_evaluations.length}
              </span>
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-amber-50 text-amber-600">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <div>
            <p className="text-xs text-slate-500 font-medium">
              Proctoring Review Flags
            </p>

            <p className="text-2xl font-bold text-slate-900">
              {report.incidents.length}{' '}
              <span className="text-xs font-normal text-slate-500">
                (No Auto-Reject)
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Proctoring Incident Timeline */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Timestamped Proctoring Event Timeline</span>
          </h2>

          <span className="text-xs text-slate-500">
            Observable events for human review — not proof of misconduct
          </span>
        </div>

        {report.incidents.length === 0 ? (
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />

            <span>
              No camera interruptions or media anomalies were recorded for this
              session.
            </span>
          </div>
        ) : (
          <div className="space-y-2.5">
            {report.incidents.map((inc, index) => (
              <div
                key={inc.id ?? `${inc.event_type}-${index}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-amber-50 border border-amber-200 gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <span className="font-bold text-amber-900 text-sm">
                    {(inc.event_type || 'PROCTORING EVENT').replace(
                      /_/g,
                      ' '
                    )}
                  </span>

                  <p className="text-sm text-amber-800 break-words">
                    {inc.description || 'No additional details provided.'}
                  </p>

                  <p className="text-xs text-amber-700">
                    Incident ID: {inc.id}
                  </p>
                </div>

                <div className="text-amber-700 text-xs font-mono shrink-0">
                  {inc.timestamp
                    ? new Date(inc.timestamp).toLocaleString()
                    : 'Time unavailable'}

                  {inc.duration_seconds != null &&
                  inc.duration_seconds > 0
                    ? ` (${inc.duration_seconds}s)`
                    : ''}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-slate-500">
          Proctoring events are observations for human review. An event alone
          does not establish cheating or misconduct.
        </p>
      </div>

      {/* Question-by-Question Evidence Breakdown */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">
          Question-by-Question Transcript &amp; Evidence Evaluation
        </h2>

        {report.questions_and_evaluations.map(
          ({ question, answer, evaluation }) => (
            <div
              key={question.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-indigo-600 uppercase">
                    Question {question.order_index} • {question.skill} (
                    {question.difficulty})
                  </span>

                  <h3 className="text-sm font-semibold text-slate-900 mt-1">
                    {question.text}
                  </h3>
                </div>

                <div className="px-3 py-1 rounded-lg bg-slate-100 text-slate-900 font-bold text-sm shrink-0">
                  {evaluation
                    ? `${evaluation.score} / ${evaluation.max_score}`
                    : answer
                      ? 'Pending Evaluation'
                      : 'Not Answered'}
                </div>
              </div>

              {answer && evaluation ? (
                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                    <span className="font-semibold text-slate-700">
                      Candidate Transcript:
                    </span>

                    <p className="text-slate-600 leading-relaxed">
                      {answer.transcript}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-indigo-50/60 border border-indigo-100 space-y-1">
                    <span className="font-semibold text-indigo-900">
                      Quoted Evidence &amp; Rubric Explanation:
                    </span>

                    <p className="italic text-indigo-800">
                      {evaluation.evidence}
                    </p>

                    <p className="text-slate-700 mt-1">
                      {evaluation.explanation}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                      <span className="font-semibold text-emerald-900 block mb-1">
                        Demonstrated Strengths
                      </span>

                      <ul className="list-disc list-inside text-emerald-800 space-y-0.5">
                        {evaluation.strengths.map((strength, i) => (
                          <li key={i}>{strength}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                      <span className="font-semibold text-amber-900 block mb-1">
                        Knowledge Gaps / Follow-up Areas
                      </span>

                      <ul className="list-disc list-inside text-amber-800 space-y-0.5">
                        {evaluation.gaps.map((gap, i) => (
                          <li key={i}>{gap}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <p className="text-xs text-slate-500 italic">
                    {answer
                      ? 'An answer was recorded, but its evaluation is not available yet.'
                      : 'No answer was recorded for this question.'}
                  </p>

                  {answer && (
                    <p className="text-sm text-slate-700 mt-2">
                      {answer.transcript}
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
};

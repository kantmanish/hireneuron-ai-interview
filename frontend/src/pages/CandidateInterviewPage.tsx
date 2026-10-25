
import { usePrimaryProctoring } from '../proctoring/usePrimaryProctoring';
import { SecondaryCameraPanel } from '../proctoring/SecondaryCameraPanel';
import type { ProctoringEventPayload } from '../proctoring/proctoring.types';
import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Camera,
  Mic,
  ShieldAlert,
  Volume2,
  Send,
  AlertTriangle,
  CheckCircle,
  VideoOff,
} from 'lucide-react';
import { api } from '../api/client';
import type { Question, Incident } from '../types';

export const CandidateInterviewPage: React.FC = () => {
  const { id: interviewId = 'demo-interview' } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [consentGiven, setConsentGiven] = useState(false);
  const [mediaReady, setMediaReady] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
const normalizeQuestion = (question: Question) => {
  const backendQuestion = question as Question & {
    question_text?: string;
  };

  return {
    ...question,
    text: backendQuestion.question_text ?? question.text,
  };
};

  const [questionNumber, setQuestionNumber] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(10);

  const [answerText, setAnswerText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  // Primary-camera and tab-visibility monitoring.
  // TAB_HIDDEN is mapped to FACE_ABSENT because the existing API accepts
  // CAMERA_INTERRUPTED, MIC_INTERRUPTED, and FACE_ABSENT.
  const { cameraAvailable } = usePrimaryProctoring({
    active: sessionStarted,
    stream: mediaStream,
    onEvent: async (event: ProctoringEventPayload) => {
      if (event.event_type === 'SECONDARY_CAMERA_DISCONNECTED') return;
console.log('PROCTORING EVENT RECEIVED:', event);     
const backendType =
  event.event_type === 'TAB_HIDDEN' ? 'FACE_ABSENT' : event.event_type;

try {
  if (!sessionId) {
    console.warn('Cannot log proctoring incident: session ID is missing.');
    return;
  }

  const incident = await api.logIncident(
    sessionId,
    backendType,
    event.description,
    event.duration_seconds ?? 5
  );

  setIncidents((prev) => [incident, ...prev]);
} catch (error) {
  console.error('Failed to log proctoring incident:', error);
}

    },
  });

  // Keep the camera status indicator synchronized with the actual media track.
  useEffect(() => {
    if (mediaStream) setCameraActive(cameraAvailable);
  }, [mediaStream, cameraAvailable]);

  // Request Camera & Microphone Permissions
  const checkMediaPermissions = async () => {
    setMediaError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = stream;
      setMediaStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setMediaReady(true);
      setCameraActive(true);
    } catch (err: any) {
      setMediaError(
        'Camera or Microphone access was denied. Please allow permissions in your browser settings or use the hardware toggle during the interview.'
      );
      setMediaReady(false);
    }
  };

  // Attach stream to video element when session starts
  useEffect(() => {
    if (sessionStarted && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [sessionStarted]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const recordProctoringEvent = async (
    type: 'CAMERA_INTERRUPTED' | 'MIC_INTERRUPTED' | 'FACE_ABSENT',
    description: string
  ) => {
    try {
      const incident = await api.logIncident(interviewId, type, description, 5);
      setIncidents((prev) => [incident, ...prev]);
    } catch {
      // Ignore logging errors so they do not interrupt the interview.
    }
  };

  // Toggle Camera Track to Demonstrate Real Proctoring Event in Demo
  const toggleCameraTrack = () => {
    const stream = streamRef.current;
    if (!stream) return;
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return;

    const nextState = !videoTrack.enabled;
    videoTrack.enabled = nextState;
    setCameraActive(nextState);

    if (!nextState) {
      recordProctoringEvent(
        'CAMERA_INTERRUPTED',
        'Candidate disabled primary camera video stream during active question.'
      );
    }
  };


const handleStartInterview = async () => {
  if (!consentGiven) return;

  try {
    const started = await api.startSession(interviewId, true);

    if (started.session_id == null) {
      throw new Error('Backend did not return a session ID.');
    }

    const newSessionId = String(started.session_id);
    setSessionId(newSessionId);

    const next = await api.getNextQuestion(newSessionId);

    if (next.completed || !next.question) {
      await api.finishSession(newSessionId);
      navigate(`/report/${newSessionId}`);
      return;
    }

    setCurrentQuestion(normalizeQuestion(next.question));
    setQuestionNumber(next.current_number || 1);
    setTotalQuestions(next.total_questions || started.total_questions || 10);
    setSessionStarted(true);
  } catch (error) {
    console.error('Unable to start interview:', error);
    alert(
      error instanceof Error
        ? error.message
        : 'Unable to start the interview. Please try again.'
    );
  }
};

  // Browser Text-to-Speech (TTS) for AI Interviewer
  const speakQuestion = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  };
// Browser Speech-to-Text (Web Speech API) with Text Fallback
  const toggleSpeechToText = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Browser Speech-to-Text is not supported in this browser. Please type your answer below.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setAnswerText((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };

    recognition.start();
  };
const handleSubmitAnswer = async (e: React.FormEvent) => {
  e.preventDefault();

  if (submitting || !currentQuestion) return;

  if (!sessionId) {
    alert('Session ID is missing. Please restart the interview.');
    return;
  }

  const answer = answerText.trim();

  if (!answer) {
    alert('Please enter your answer before submitting.');
    return;
  }

  setSubmitting(true);

  try {
    // 1. Save the candidate's answer.
    await api.submitAnswer(
      sessionId,
      String(currentQuestion.id),
      answer
    );

    setAnswerText('');

    // 2. Fetch the next question using the session ID.
    const next = await api.getNextQuestion(sessionId);

    // 3. If there are no more questions, finish and open the report.
    if (next.completed || !next.question) {
      await api.finishSession(sessionId);

      streamRef.current?.getTracks().forEach((track) => track.stop());

      navigate(`/report/${sessionId}`);
      return;
    }

    // 4. Otherwise, display the next question.
    setCurrentQuestion(normalizeQuestion(next.question));
    setQuestionNumber(next.current_number || questionNumber + 1);
    setTotalQuestions(next.total_questions || totalQuestions);
  } catch (error) {
    console.error('Failed to submit answer or advance interview:', error);

    alert(
      error instanceof Error
        ? error.message
        : 'Something went wrong while submitting your answer. Please try again.'
    );
  } finally {
    setSubmitting(false);
  }
};

  // LOBBY VIEW: Consent + Camera/Mic Check
  if (!sessionStarted) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 mb-2">
              CANDIDATE ONBOARDING & CONSENT
            </span>
            <h1 className="text-2xl font-bold text-slate-900">
              Welcome to Your AI Video Interview
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Session ID: <span className="font-mono font-medium">{interviewId}</span>
            </p>
          </div>

          <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2 leading-relaxed">
            <div className="font-semibold flex items-center gap-1.5 text-amber-800">
              <ShieldAlert className="w-4 h-4" />
              <span>Informed Consent & Proctoring Notice</span>
            </div>
            <p>
              1. Your audio/text responses will be transcribed and evaluated by an AI rubric against job-specific criteria.
            </p>
            <p>
              2. Basic camera and media-status events (such as camera disconnection or tab switching) are logged with timestamps as review flags.
            </p>
            <p>
              3. <strong>No automatic rejection:</strong> AI scores and proctoring flags are reviewed by a human recruiter who makes all final hiring decisions.
            </p>
          </div>

          {/* Camera Preview Box */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">
                Hardware Check (Camera & Microphone)
              </span>
              <button
                type="button"
                onClick={checkMediaPermissions}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                {mediaReady ? 'Camera Connected' : 'Enable Camera & Mic'}
              </button>
            </div>

            {mediaError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                {mediaError}
              </div>
            )}

            <div className="aspect-video w-full max-w-md mx-auto bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${mediaReady ? 'block' : 'hidden'}`}
              />
              {!mediaReady && (
                <div className="text-center text-slate-400 text-xs p-4">
                  <Camera className="w-8 h-8 mx-auto mb-2 opacity-60" />
                  Click "Enable Camera & Mic" above to verify your video stream.
                </div>
              )}
            </div>
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer text-sm text-slate-700">
            <input
              type="checkbox"
              checked={consentGiven}
              onChange={(e) => setConsentGiven(e.target.checked)}
              className="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>
              I have read the interview rules and provide explicit consent to audio/video monitoring and AI-assisted response evaluation.
            </span>
          </label>

          <button
            type="button"
            disabled={!consentGiven}
            onClick={handleStartInterview}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-semibold rounded-lg transition cursor-pointer"
          >
            Start Interview ({totalQuestions} Questions)
          </button>
        </div>
      </div>
    );
  }

  // ACTIVE INTERVIEW ROOM VIEW
  return (
    <div className="max-w-6xl mx-auto py-6 px-4 grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left: Question & Answer Area */}
      <div className="lg:col-span-8 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Question {questionNumber} of {totalQuestions}
            </span>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                {currentQuestion?.skill}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                {currentQuestion?.difficulty}
              </span>
            </div>
          </div>

          <div className="flex items-start justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-900 leading-snug">
              {currentQuestion?.text}
            </h2>
            <button
              type="button"
              onClick={() => currentQuestion && speakQuestion(currentQuestion.text)}
              title="Read Question Aloud (TTS)"
              className="p-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 shrink-0 cursor-pointer"
            >
              <Volume2 className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmitAnswer} className="space-y-4 pt-2">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-600">
                  Your Response (Speak via Mic or Type Below)
                </label>
                <button
                  type="button"
                  onClick={toggleSpeechToText}
                  className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 cursor-pointer ${
                    isListening
                      ? 'bg-red-100 text-red-700 animate-pulse'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  {isListening ? 'Listening... (Click to Stop)' : 'Dictate with Voice (STT)'}
                </button>
              </div>

              <textarea
                rows={6}
                required
                placeholder="Explain your approach, specific examples, and technical trade-offs..."
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={async () => {
                  if (!sessionId) return;
                  await api.finishSession(sessionId);
                  navigate(`/report/${sessionId}`);

                }}
                className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
              >
                End Interview Early & View Report
              </button>

              <button
                type="submit"
                disabled={submitting || !answerText.trim()}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-medium py-2.5 px-6 rounded-lg transition cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>
                  {submitting
                    ? 'Saving...'
                    : questionNumber === totalQuestions
                    ? 'Submit Final Answer'
                    : 'Submit & Next Question'}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Right: Proctoring Monitor & Live Camera */}
      <div className="lg:col-span-4 space-y-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Primary Camera Feed
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${
                cameraActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
              }`}
            >
              {cameraActive ? (
                <>
                  <CheckCircle className="w-3 h-3" /> Active
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3 h-3" /> Interrupted
                </>
              )}
            </span>
          </div>

          <div className="aspect-video bg-slate-900 rounded-lg overflow-hidden relative flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
            />
            {!cameraActive && (
              <div className="text-center text-red-300 text-xs p-4">
                <VideoOff className="w-7 h-7 mx-auto mb-1" />
                Camera feed interrupted. Event logged.
              </div>
            )}
          </div>

          <div className="pt-1 flex gap-2">
            <button
              type="button"
              onClick={toggleCameraTrack}
              className="w-full py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium cursor-pointer"
            >
              {cameraActive ? 'Simulate Camera Drop (Test Proctoring)' : 'Restore Camera Feed'}
            </button>
          </div>
        </div>

        {/* Optional secondary smartphone camera */}
        <SecondaryCameraPanel
          interviewId={interviewId}
          apiBaseUrl={import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'}
          onEvent={async (event: ProctoringEventPayload) => {
            // The current incident API accepts FACE_ABSENT for this review flag.
            // Update the backend contract later if it supports a dedicated secondary-camera event.
            try {
              const incident = await api.logIncident(
                interviewId,
                'FACE_ABSENT',
                event.description,
                5
              );
              setIncidents((prev) => [incident, ...prev]);
            } catch {
              // Keep the interview usable if incident logging fails.
            }
          }}
        />

        {/* Live Incident Log */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-3">
          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Observable Proctoring Log ({incidents.length})
          </h3>
          {incidents.length === 0 ? (
            <p className="text-xs text-slate-500">
              No integrity flags logged. Keep the camera active and stay on this tab.
            </p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {incidents.map((inc) => (
                <div
                  key={inc.id}
                  className="p-2.5 rounded bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-0.5"
                >
                  <div className="font-semibold flex justify-between">
                    <span>{inc.event_type}</span>
                    <span className="text-[10px] text-amber-700">
                      {new Date(inc.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800">{inc.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
import axios from 'axios';
import type {
  Interview,
  Question,
  Answer,
  Incident,
  InterviewReport,
  IncidentType,
} from '../types';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  `${window.location.protocol}//${window.location.hostname}:8000/api`;

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

const mockStore = {
  interviews: {} as Record<string, Interview>,
  questions: {} as Record<string, Question[]>,
  answers: {} as Record<string, Answer[]>,
  incidents: {} as Record<string, Incident[]>,
  currentIndex: {} as Record<string, number>,
};

export const api = {
  // 1. POST /api/interviews
  async createInterview(data: {
    job_title: string;
    job_description: string;
    required_skills: string[];
    experience_level: string;
    question_limit?: number;
    duration_minutes?: number;
  }): Promise<Interview> {
    if (USE_MOCK) {
      const id = 'int-' + Math.random().toString(36).substring(2, 8);
      const interview: Interview = {
        id,
        job_title: data.job_title,
        job_description: data.job_description,
        required_skills: data.required_skills,
        experience_level: data.experience_level,
        question_limit: data.question_limit || 10,
        duration_minutes: data.duration_minutes || 30,
        status: 'CREATED',
      };
      mockStore.interviews[id] = interview;
      return interview;
    }
    const res = await apiClient.post<Interview>('/interviews', data);
    return res.data;
  },

  // 2. POST /api/interviews/{id}/resume
  async uploadResume(interviewId: string, _file: File): Promise<{ status: string; extracted_chars: number }> {
    if (USE_MOCK) {
      if (mockStore.interviews[interviewId]) {
        mockStore.interviews[interviewId].resume_extracted = true;
      }
      return { status: 'EXTRACTED', extracted_chars: 2450 };
    }
    const formData = new FormData();
    formData.append('file', _file);
    const res = await apiClient.post(`/interviews/${interviewId}/resume`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  // 3. POST /api/interviews/{id}/generate-questions
  async generateQuestions(interviewId: string, count = 10): Promise<Question[]> {
    if (USE_MOCK) {
      const interview = mockStore.interviews[interviewId];
      const skills = interview?.required_skills?.length
        ? interview.required_skills
        : ['React', 'TypeScript', 'System Design', 'Problem Solving'];
      const mockQuestions: Question[] = Array.from({ length: count }, (_, idx) => {
        const skill = skills[idx % skills.length];
        return {
          id: `q-${idx + 1}`,
          interview_id: interviewId,
          order_index: idx + 1,
          text: `Can you explain a challenging technical problem you solved using ${skill} and how you validated your solution? (Question ${idx + 1} of ${count})`,
          category: idx % 2 === 0 ? 'Technical Depth' : 'Applied Experience',
          difficulty: idx < 3 ? 'Easy' : idx < 7 ? 'Medium' : 'Hard',
          skill,
        };
      });
      mockStore.questions[interviewId] = mockQuestions;
      mockStore.currentIndex[interviewId] = 0;
      if (interview) interview.status = 'READY';
      return mockQuestions;
    }
    const res = await apiClient.post<Question[]>(`/interviews/${interviewId}/generate-questions`, { count });
    return res.data;
  },

  // 4. GET /api/interviews/{id}
  async getInterview(interviewId: string): Promise<{ interview: Interview; questions: Question[] }> {
    if (USE_MOCK) {
      const interview: Interview = mockStore.interviews[interviewId] || {
        id: interviewId,
        job_title: 'Full Stack Software Engineer',
        job_description: 'Build scalable web systems with React and Python.',
        required_skills: ['React', 'TypeScript', 'FastAPI', 'SQLite'],
        experience_level: 'Mid-Level',
        question_limit: 10,
        duration_minutes: 30,
        status: 'READY',
      };
      const questions =
        mockStore.questions[interviewId] || (await this.generateQuestions(interviewId, interview.question_limit));
      return { interview, questions };
    }
    const res = await apiClient.get(`/interviews/${interviewId}`);
    return res.data;
  },

  // 5. POST /api/sessions/{id}/start
async startSession(
  interviewId: string,
  consentGiven: boolean
): Promise<{
  message?: string;
  status: string;
  session_id?: number | string;
  interview_id?: number | string;
  total_questions?: number;
}> {
  if (USE_MOCK) {
    if (mockStore.interviews[interviewId]) {
      mockStore.interviews[interviewId].status = 'IN_PROGRESS';
    }
    mockStore.currentIndex[interviewId] = 0;
    return {
      status: 'IN_PROGRESS',
      session_id: interviewId,
      interview_id: interviewId,
    };
  }

  const res = await apiClient.post(
    `/sessions/${encodeURIComponent(interviewId)}/start`,
    { consent_given: consentGiven }
  );

  return res.data;
},


  // 6. GET /api/sessions/{id}/next-question
  async getNextQuestion(interviewId: string): Promise<{
    completed: boolean;
    question?: Question;
    current_number?: number;
    total_questions?: number;
  }> {
    if (USE_MOCK) {
      const questions = mockStore.questions[interviewId] || (await this.generateQuestions(interviewId, 10));
      const idx = mockStore.currentIndex[interviewId] ?? 0;
      if (idx >= questions.length) {
        return { completed: true };
      }
      return {
        completed: false,
        question: questions[idx],
        current_number: idx + 1,
        total_questions: questions.length,
      };
    }
    const res = await apiClient.get(`/sessions/${interviewId}/next-question`);
    return res.data;
  },

  // 7. POST /api/sessions/{id}/answers
  async submitAnswer(interviewId: string, questionId: string, transcript: string): Promise<Answer> {
    if (USE_MOCK) {
      const ans: Answer = {
        id: 'ans-' + Math.random().toString(36).substring(2, 7),
        question_id: questionId,
        transcript,
        status: 'SUBMITTED',
        submitted_at: new Date().toISOString(),
      };
      if (!mockStore.answers[interviewId]) mockStore.answers[interviewId] = [];
      mockStore.answers[interviewId].push(ans);
      mockStore.currentIndex[interviewId] = (mockStore.currentIndex[interviewId] ?? 0) + 1;
      return ans;
    }
    const res = await apiClient.post<Answer>(`/sessions/${interviewId}/answers`, {
      question_id: questionId,
      transcript,
    });
    return res.data;
  },

  // 8. POST /api/sessions/{id}/incidents 
  // 8. POST /api/sessions/{session_id}/incidents
  async logIncident(
    sessionId: string,
    eventType: IncidentType,
    description: string,
    durationSeconds?: number
  ): Promise<Incident> {
    if (USE_MOCK) {
      const inc: Incident = {
        id: 'inc-' + Math.random().toString(36).substring(2, 7),
        interview_id: sessionId,
        event_type: eventType,
        timestamp: new Date().toISOString(),
        duration_seconds: durationSeconds,
        description,
      };

      if (!mockStore.incidents[sessionId]) {
        mockStore.incidents[sessionId] = [];
      }

      mockStore.incidents[sessionId].push(inc);
      return inc;
    }

    const res = await apiClient.post<Incident>(
      `/sessions/${encodeURIComponent(sessionId)}/incidents`,
      {
        event_type: eventType,
        timestamp: new Date().toISOString(),
        duration_seconds: durationSeconds,
        description,
      }
    );

    return res.data;
  },

  // 9. POST /api/sessions/{id}/finish
  async finishSession(interviewId: string): Promise<{ status: string }> {
    if (USE_MOCK) {
      if (mockStore.interviews[interviewId]) {
        mockStore.interviews[interviewId].status = 'COMPLETED';
      }
      return { status: 'COMPLETED' };
    }
    const res = await apiClient.post(`/sessions/${interviewId}/finish`);
    return res.data;
  },

  // 10. GET /api/sessions/{id}/report
  async getReport(interviewId: string): Promise<InterviewReport> {
    if (USE_MOCK) {
      const { interview, questions } = await this.getInterview(interviewId);
      const answers = mockStore.answers[interviewId] || [];
      const incidents = mockStore.incidents[interviewId] || [];

      const qaList = questions.map((q) => {
        const ans = answers.find((a) => a.question_id === q.id) || null;
        const hasGoodLength = Boolean(ans && ans.transcript.trim().length > 30);
        const score = ans ? (hasGoodLength ? 8.5 : 5.0) : 0;
        return {
          question: q,
          answer: ans,
          evaluation: ans
            ? {
                answer_id: ans.id,
                score,
                max_score: 10,
                explanation: `[DEV FALLBACK EVALUATION] Evaluated response against ${q.skill} rubric.`,
                evidence: `"${ans.transcript.slice(0, 120)}${ans.transcript.length > 120 ? '...' : ''}"`,
                strengths: hasGoodLength
                  ? [`Clear explanation of ${q.skill}`, 'Structured problem breakdown']
                  : ['Attempted question'],
                gaps: hasGoodLength
                  ? ['Could include more quantitative metrics']
                  : ['Response was brief and lacked technical depth'],
              }
            : null,
        };
      });

      const totalScore = qaList.reduce((acc, item) => acc + (item.evaluation?.score || 0), 0);
      return {
        interview: { ...interview, status: 'COMPLETED' },
        overall_score: Number(totalScore.toFixed(1)),
        max_overall_score: questions.length * 10,
        questions_and_evaluations: qaList,
        incidents,
      };
    }
    const res = await apiClient.get<InterviewReport>(`/sessions/${interviewId}/report`);
    return res.data;
  },
};
export type InterviewStatus = 'CREATED' | 'READY' | 'IN_PROGRESS' | 'COMPLETED';

export type IncidentType =
  | 'CAMERA_INTERRUPTED'
  | 'MIC_INTERRUPTED'
  | 'FACE_ABSENT'
  | 'MULTIPLE_PERSONS'
  | 'AUDIO_ANOMALY';

export interface Interview {
  id: string;
  job_title: string;
  job_description: string;
  required_skills: string[];
  experience_level: string;
  question_limit: number;
  duration_minutes: number;
  status: InterviewStatus;
  resume_extracted?: boolean;
}

export interface Question {
  id: string;
  interview_id: string;
  order_index: number;
  text: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  skill: string;
}

export interface Answer {
  id: string;
  question_id: string;
  transcript: string;
  status: 'SUBMITTED' | 'EVALUATED';
  submitted_at: string;
}

export interface Evaluation {
  answer_id: string;
  score: number;
  max_score: number;
  explanation: string;
  evidence: string;
  strengths: string[];
  gaps: string[];
}

export interface Incident {
  id: string;
  interview_id: string;
  event_type: IncidentType;
  timestamp: string;
  duration_seconds?: number;
  description: string;
}

export interface InterviewReport {
  interview: Interview;
  overall_score: number;
  max_overall_score: number;
  questions_and_evaluations: Array<{
    question: Question;
    answer: Answer | null;
    evaluation: Evaluation | null;
  }>;
  incidents: Incident[];
}
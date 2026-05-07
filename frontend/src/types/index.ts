export interface ReviewListItem {
  id: string;
  title: string;
  created_at: string;
  status: 'pending' | 'processing' | 'complete' | 'failed';
  recommendation: 'Accept' | 'Minor revision' | 'Major revision' | 'Reject' | null;
  overall_score: number | null;
}

export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  is_active: boolean;
  is_email_verified: boolean;
  organisation: string | null;
  avatar_url: string | null;
  created_at: string;
  last_login: string | null;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface SignupResponse {
  message: string;
  email: string;
  verification_url?: string | null;
}

export interface UserCreate {
  email: string;
  username: string;
  full_name?: string | null;
  password: string;
  organisation?: string | null;
}

export interface UserUpdate {
  full_name?: string | null;
  organisation?: string | null;
  avatar_url?: string | null;
}

export interface DimensionScore {
  dimension: string;
  score: number;
  strengths: string[];
  weaknesses: string[];
  critical_issues: string[];
  suggestions: string[];
}

export interface RelatedPaper {
  title: string;
  authors: string | null;
  year: number | null;
  citation_count: number | null;
  relevance_note: string | null;
}

export interface MajorFlaw {
  issue: string;
  evidence: string;
  remedy: string;
  severity?: string | null;
}

export interface FullReview {
  id: string;
  title: string;
  authors: string | null;
  abstract: string | null;
  field: string | null;
  status: string;
  recommendation: string | null;
  overall_score: number | null;
  summary: string | null;
  general_comments: string | null;
  major_flaws: MajorFlaw[];
  minor_points: string[];
  dimension_scores: DimensionScore[];
  related_papers: RelatedPaper[];
  research_llm_raw_output?: string | null;
  openreview_examples_prompt?: string | null;
  review_llm_raw_output?: string | null;
  created_at: string;
}

export interface ProgressEvent {
  step: string;
  message: string;
  review_id: string | null;
  status: string;
}

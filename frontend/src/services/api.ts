// frontend/src/services/api.ts
import axios from 'axios';
import { Issue, IssueFilters, AnalysisResult } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: BASE_URL });

export interface CreateIssueResponse {
  issue: Issue;
  analysis: AnalysisResult;
}

export async function fetchIssues(filters?: Partial<IssueFilters>): Promise<{ issues: Issue[]; isDatabase?: boolean }> {
  const params: Record<string, string> = {};
  if (filters?.search) params.search = filters.search;
  if (filters?.category) params.category = filters.category;
  if (filters?.status) params.status = filters.status;
  if (filters?.minSeverity) params.minSeverity = String(filters.minSeverity);
  const { data } = await api.get<any>('/issues', { params });
  // Backend now returns { issues: [...], isDatabase: true }; handle legacy raw array gracefully
  const issues: Issue[] = Array.isArray(data) ? data : (data?.issues ?? []);
  const isDatabase: boolean | undefined = Array.isArray(data) ? undefined : data?.isDatabase;
  return { issues, isDatabase };
}

export async function fetchIssueById(id: string): Promise<Issue> {
  const { data } = await api.get<any>(`/issues/${id}`);
  // Backend returns the issue object directly (not wrapped in { issue })
  return (data && data._id) ? data : (data?.issue ?? data);
}

export async function createIssue(formData: FormData): Promise<CreateIssueResponse> {
  const { data } = await api.post<any>('/issues', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  // Handle if backend returned the issue directly or wrapped in { issue }
  const issue = (data && data._id) ? data : (data?.issue || data);
  const analysis = data?.analysis || null;
  return { issue, analysis };
}

export async function updateIssueStatus(id: string, status: string, note?: string): Promise<Issue> {
  const { data } = await api.patch<any>(`/issues/${id}/status`, { status, note });
  return (data && data._id) ? data : (data?.issue ?? data);
}

export async function updateIssue(id: string, updates: Partial<Issue>): Promise<Issue> {
  const { data } = await api.patch<any>(`/issues/${id}`, updates);
  return (data && data._id) ? data : (data?.issue ?? data);
}

export async function analyzeIssuePreview(payload: {
  title: string;
  description: string;
  category?: string;
  location?: string;
}): Promise<AnalysisResult> {
  const { data } = await api.post<any>('/issues/analyze', payload);
  return {
    category: data.category || data.suggestedCategory || 'Other',
    categoryReasons: data.categoryReasons || [],
    confidence: data.confidence ?? data.categoryConfidence ?? 0.8,
    severityScore: data.severityScore ?? data.priorityScore ?? 0,
    severityLabel: (data.severityLabel || data.priorityLabel || 'Medium') as any,
    severityFactors: data.severityFactors || data.priorityFactors || [],
    duplicate: data.duplicate || (data.potentialDuplicate ? {
      id: data.potentialDuplicate.id,
      title: data.potentialDuplicate.title,
      reason: data.potentialDuplicate.reason,
      similarity: data.potentialDuplicate.similarity
    } : null)
  };
}

// Authentication & Worker Workflow APIs
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'citizen' | 'officer' | 'worker';
  department: string;
  phone: string;
}

export async function loginUser(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const { data } = await api.post('/auth/login', { email, password });
  if (data?.token) {
    localStorage.setItem('civiclens_auth_token', data.token);
    api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
  }
  return data;
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem('civiclens_auth_token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    localStorage.removeItem('civiclens_auth_token');
    delete api.defaults.headers.common['Authorization'];
  }
}

export async function fetchDemoUsers(): Promise<{ users: AuthUser[] }> {
  const { data } = await api.get('/auth/demo-users');
  return data;
}

export async function fetchWorkers(): Promise<{ workers: AuthUser[] }> {
  const { data } = await api.get('/auth/workers');
  return data;
}

export async function assignIssueWorker(
  issueId: string,
  payload: { workerId?: string; workerName: string; department?: string; deadline?: string; internalInstructions?: string }
): Promise<Issue> {
  const { data } = await api.post(`/issues/${issueId}/assign`, payload);
  return (data && data._id) ? data : (data?.issue || data);
}

export async function submitWorkerTaskUpdate(
  issueId: string,
  payload: { progressNote: string; markComplete: boolean; evidencePhotos?: string[] }
): Promise<Issue> {
  const { data } = await api.post(`/issues/${issueId}/worker-update`, payload);
  return (data && data._id) ? data : (data?.issue || data);
}

export async function verifyAndResolveIssue(
  issueId: string,
  payload: { approved: boolean; returnReason?: string }
): Promise<Issue> {
  const { data } = await api.post(`/issues/${issueId}/verify-resolve`, payload);
  return (data && data._id) ? data : (data?.issue || data);
}

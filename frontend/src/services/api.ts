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
  const { data } = await api.patch<{ issue: Issue }>(`/issues/${id}/status`, { status, note });
  return data.issue;
}

export async function updateIssue(id: string, updates: Partial<Issue>): Promise<Issue> {
  const { data } = await api.patch<{ issue: Issue }>(`/issues/${id}`, updates);
  return data.issue;
}

export async function analyzeIssuePreview(payload: {
  title: string;
  description: string;
  category?: string;
  location?: string;
}): Promise<AnalysisResult> {
  const { data } = await api.post<AnalysisResult>('/issues/analyze', payload);
  return data;
}

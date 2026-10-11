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
  const { data } = await api.get<{ issues: Issue[]; isDatabase?: boolean }>('/issues', { params });
  return data;
}

export async function fetchIssueById(id: string): Promise<Issue> {
  const { data } = await api.get<{ issue: Issue }>(`/issues/${id}`);
  return data.issue;
}

export async function createIssue(formData: FormData): Promise<CreateIssueResponse> {
  const { data } = await api.post<CreateIssueResponse>('/issues', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
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

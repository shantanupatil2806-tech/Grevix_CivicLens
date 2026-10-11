// frontend/src/services/analysis.ts
import type { Category, Issue, AnalysisResult } from '../types';

const CATEGORY_KEYWORDS: Record<Category, { regex: RegExp; label: string }[]> = {
  Roads: [
    { regex: /pothole/i, label: 'pothole damage' },
    { regex: /road|street|asphalt|highway|lane|pavement|sidewalk/i, label: 'roadway infrastructure' },
    { regex: /speed breaker|tar/i, label: 'traffic surface' }
  ],
  Garbage: [
    { regex: /garbage|trash|waste|litter|dump|rubbish|debris/i, label: 'waste accumulation' },
    { regex: /bin|dumpster/i, label: 'overflowing waste bin' },
    { regex: /smell|stench|foul/i, label: 'unsanitary odor' }
  ],
  Water: [
    { regex: /leak|pipeline|pipe/i, label: 'pipe leakage' },
    { regex: /flood|waterlog|drain|drainage|sewer|gutter/i, label: 'drainage or sewage overflow' },
    { regex: /contamination|drinking water|tap/i, label: 'water supply issue' }
  ],
  Electricity: [
    { regex: /streetlight|street light|light/i, label: 'streetlight failure' },
    { regex: /wire|cable|electric|spark|transformer|power cut|outage|blackout/i, label: 'electrical fault' },
    { regex: /shock|hanging wire/i, label: 'exposed electrical hazard' }
  ],
  Other: [],
};

export function analyzeCategory(title: string, description: string): { category: Category; confidence: number; reasons: string[] } {
  const text = `${title || ''} ${description || ''}`.trim();
  const matchedKeywords: { category: Category; label: string }[] = [];

  for (const [cat, patterns] of Object.entries(CATEGORY_KEYWORDS) as [Category, { regex: RegExp; label: string }[]][]) {
    if (cat === 'Other') continue;
    for (const item of patterns) {
      if (item.regex.test(text)) {
        matchedKeywords.push({ category: cat, label: item.label });
      }
    }
  }

  if (matchedKeywords.length > 0) {
    const counts: Record<string, number> = {};
    for (const match of matchedKeywords) {
      counts[match.category] = (counts[match.category] || 0) + 1;
    }
    let bestCategory: Category = 'Other';
    let maxCount = 0;
    for (const [cat, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        bestCategory = cat as Category;
      }
    }
    const relevantReasons = matchedKeywords
      .filter((m) => m.category === bestCategory)
      .map((m) => m.label);

    return {
      category: bestCategory,
      confidence: Math.min(60 + maxCount * 15, 95),
      reasons: Array.from(new Set(relevantReasons))
    };
  }

  return {
    category: 'Other',
    confidence: 40,
    reasons: ['No domain keywords detected; fallback to Other']
  };
}

export function suggestCategory(title: string, description: string): Category {
  return analyzeCategory(title, description).category;
}

export function computeSeverityDetails(issue: { category: Category; title: string; description: string }): {
  score: number;
  label: 'Low' | 'Medium' | 'High' | 'Critical';
  factors: string[];
} {
  const { category, title, description } = issue;
  const text = `${title || ''} ${description || ''}`.trim();

  const baseWeights: Record<Category, number> = {
    Roads: 35,
    Garbage: 25,
    Water: 45,
    Electricity: 50,
    Other: 20
  };

  let score = baseWeights[category] ?? 20;
  const factors: string[] = [`Base category priority for ${category}: ${score} pts`];

  const criticalKeywords = [
    { regex: /hospital|school|ambulance|fire exit|emergency/i, pts: 25, reason: 'Near sensitive institution / emergency passage (+25 pts)' },
    { regex: /danger|fatal|hazard|collapse|cave-in|open manhole|high voltage|spark/i, pts: 20, reason: 'High public safety hazard detected (+20 pts)' },
    { regex: /urgent|immediate|critical|asap|dire/i, pts: 15, reason: 'High urgency terminology indicated (+15 pts)' },
    { regex: /flood|waterlog|continuous|blackout/i, pts: 10, reason: 'Active disruption condition (+10 pts)' }
  ];

  for (const item of criticalKeywords) {
    if (item.regex.test(text)) {
      score += item.pts;
      factors.push(item.reason);
    }
  }

  score = Math.min(Math.max(score, 10), 100);

  let label: 'Low' | 'Medium' | 'High' | 'Critical' = 'Low';
  if (score >= 80) label = 'Critical';
  else if (score >= 60) label = 'High';
  else if (score >= 40) label = 'Medium';

  return {
    score,
    label,
    factors
  };
}

export function computeSeverityScore(issue: { category: Category; title: string; description: string }): number {
  return computeSeverityDetails(issue).score;
}

export function getSeverityLabel(score: number): 'Low' | 'Medium' | 'High' | 'Critical' {
  if (score >= 80) return 'Critical';
  if (score >= 60) return 'High';
  if (score >= 40) return 'Medium';
  return 'Low';
}

export function getSeverityColor(score: number): string {
  if (score >= 80) return 'bg-red-100 text-red-700 border-red-200';
  if (score >= 60) return 'bg-amber-100 text-amber-700 border-amber-200';
  if (score >= 40) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  return 'bg-green-100 text-green-700 border-green-200';
}

export function detectDuplicatesWithReasons(newIssue: Partial<Issue>, existing: Issue[]): {
  duplicate: Issue;
  reason: string;
  similarity: number;
} | null {
  const norm = (s: string) => (s || '').trim().toLowerCase().replace(/[^a-z0-9 ]/g, '');
  const newTitle = norm(newIssue.title || '');
  const newDesc = norm(newIssue.description || '');
  const newLoc = norm(newIssue.location || '');
  const newWords = new Set(newTitle.split(/\s+/).filter((w) => w.length > 3));

  for (const issue of existing) {
    if (issue._id && newIssue._id && String(issue._id) === String(newIssue._id)) continue;

    const existingTitle = norm(issue.title || '');
    const existingDesc = norm(issue.description || '');
    const existingLoc = norm(issue.location || '');

    if (newTitle && newTitle === existingTitle) {
      return {
        duplicate: issue,
        reason: 'Identical title match with an existing active report',
        similarity: 100
      };
    }

    const sameLocation = Boolean(newLoc && existingLoc && (newLoc.includes(existingLoc) || existingLoc.includes(newLoc)));
    const sameCategory = issue.category && newIssue.category && issue.category === newIssue.category;

    const existingWords = existingTitle.split(/\s+/).filter((w) => w.length > 3);
    let commonWords = 0;
    for (const w of existingWords) {
      if (newWords.has(w)) commonWords++;
    }

    if (sameCategory && sameLocation && (commonWords >= 2 || newTitle.includes(existingTitle) || existingTitle.includes(newTitle))) {
      return {
        duplicate: issue,
        reason: `Same category (${issue.category}) and matching location area: "${issue.location}"`,
        similarity: 85
      };
    }

    if (newDesc.length > 15 && existingDesc.length > 15) {
      if (newDesc.includes(existingDesc) || existingDesc.includes(newDesc)) {
        return {
          duplicate: issue,
          reason: 'Substantial description similarity match',
          similarity: 80
        };
      }
    }
  }

  return null;
}

export function detectDuplicate(newIssue: Partial<Issue>, existing: Issue[]): Issue | null {
  const res = detectDuplicatesWithReasons(newIssue, existing);
  return res ? res.duplicate : null;
}

export function runFullClientAnalysis(
  title: string,
  description: string,
  selectedCategory: Category | '',
  location: string,
  existingIssues: Issue[]
): AnalysisResult {
  const catAnalysis = analyzeCategory(title, description);
  const resolvedCategory = (selectedCategory || catAnalysis.category) as Category;

  const severityDetails = computeSeverityDetails({
    category: resolvedCategory,
    title,
    description
  });

  const dupe = detectDuplicatesWithReasons(
    { title, description, category: resolvedCategory, location },
    existingIssues
  );

  return {
    category: catAnalysis.category,
    categoryReasons: catAnalysis.reasons,
    confidence: catAnalysis.confidence,
    severityScore: severityDetails.score,
    severityLabel: severityDetails.label,
    severityFactors: severityDetails.factors,
    duplicate: dupe ? {
      id: dupe.duplicate._id,
      title: dupe.duplicate.title,
      reason: dupe.reason,
      similarity: dupe.similarity
    } : null
  };
}

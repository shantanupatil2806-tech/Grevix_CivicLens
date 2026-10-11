// backend/src/utils/analysis.js

const CATEGORY_KEYWORDS = {
  'Roads/Potholes': [
    { regex: /pothole/i, label: 'pothole damage' },
    { regex: /road|street|asphalt|highway|lane|pavement|sidewalk/i, label: 'roadway infrastructure' },
    { regex: /speed breaker|tar|crater|paving/i, label: 'traffic surface' }
  ],
  'Garbage/Waste': [
    { regex: /garbage|trash|waste|litter|dump|rubbish|debris/i, label: 'waste accumulation' },
    { regex: /bin|dumpster|compactor/i, label: 'overflowing waste bin' },
    { regex: /smell|stench|foul|stench|rotting/i, label: 'unsanitary odor' }
  ],
  'Water Supply/Leakage': [
    { regex: /leak|pipeline|pipe|burst pipe/i, label: 'pipe leakage' },
    { regex: /contamination|drinking water|tap|low pressure|no water/i, label: 'water supply disruption' },
    { regex: /potable|water tank|main supply/i, label: 'municipal water network' }
  ],
  'Streetlights/Electricity': [
    { regex: /streetlight|street light|light pole|lamp post/i, label: 'streetlight failure' },
    { regex: /wire|cable|electric|spark|transformer|power cut|outage|blackout/i, label: 'electrical fault' },
    { regex: /shock|hanging wire|short circuit/i, label: 'exposed electrical hazard' }
  ],
  'Drainage': [
    { regex: /drain|drainage|sewer|sewage|gutter|manhole/i, label: 'drainage or sewage overflow' },
    { regex: /clogged drain|blocked gutter|stagnant/i, label: 'stormwater blockage' },
    { regex: /flood|waterlog|waterlogging|flooding/i, label: 'urban flooding' }
  ],
  'Public Infrastructure': [
    { regex: /bridge|flyover|footover|bus stop|bench|public park|railing/i, label: 'public facility damage' },
    { regex: /sidewalk|pavement tile|subway|underpass|traffic signal|zebra crossing/i, label: 'pedestrian asset defect' },
    { regex: /boundary wall|public toilet|fountain/i, label: 'civic amenities' }
  ],
  Other: []
};

// Aliases for legacy categories
const CATEGORY_ALIASES = {
  Roads: 'Roads/Potholes',
  Garbage: 'Garbage/Waste',
  Water: 'Water Supply/Leakage',
  Electricity: 'Streetlights/Electricity'
};

function normalizeCategory(cat) {
  return CATEGORY_ALIASES[cat] || cat || 'Other';
}

function analyzeCategory(title, description) {
  const text = ((title || '') + ' ' + (description || '')).trim();
  const matchedKeywords = [];

  for (const [cat, patterns] of Object.entries(CATEGORY_KEYWORDS)) {
    if (cat === 'Other') continue;
    for (const item of patterns) {
      if (item.regex.test(text)) {
        matchedKeywords.push({ category: cat, label: item.label });
      }
    }
  }

  if (matchedKeywords.length > 0) {
    const counts = {};
    for (const match of matchedKeywords) {
      counts[match.category] = (counts[match.category] || 0) + 1;
    }
    let bestCategory = 'Other';
    let maxCount = 0;
    for (const [cat, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        bestCategory = cat;
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
    reasons: ['No domain-specific keywords matched; categorized under Other']
  };
}

function suggestCategory(title, description) {
  return analyzeCategory(title, description).category;
}

function computeSeverityDetails(issue) {
  const rawCategory = issue.category;
  const category = normalizeCategory(rawCategory);
  const { title, description } = issue;
  const text = ((title || '') + ' ' + (description || '')).trim();

  const baseWeights = {
    'Roads/Potholes': 35,
    'Garbage/Waste': 25,
    'Water Supply/Leakage': 45,
    'Streetlights/Electricity': 50,
    'Drainage': 45,
    'Public Infrastructure': 30,
    'Other': 20
  };

  let score = baseWeights[category] || 20;
  const factors = [`Base category weight for ${category}: ${score} pts`];

  const criticalKeywords = [
    { regex: /hospital|school|ambulance|fire exit|emergency/i, pts: 25, reason: 'Near sensitive institution / emergency route (+25 pts)' },
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

  let label = 'Low';
  if (score >= 80) label = 'Critical';
  else if (score >= 60) label = 'High';
  else if (score >= 40) label = 'Medium';

  return {
    score,
    label,
    factors
  };
}

function computeSeverityScore(issue) {
  return computeSeverityDetails(issue).score;
}

function detectDuplicatesWithReasons(newIssue, existingIssues) {
  const norm = (str) => (str || '').trim().toLowerCase().replace(/[^a-z0-9 ]/g, '');
  const newTitle = norm(newIssue.title);
  const newDesc = norm(newIssue.description);
  const newLoc = norm(newIssue.location);
  const newWords = new Set(newTitle.split(/\s+/).filter((w) => w.length > 3));

  for (const issue of existingIssues || []) {
    if (issue._id && newIssue._id && String(issue._id) === String(newIssue._id)) continue;

    const existingTitle = norm(issue.title);
    const existingDesc = norm(issue.description);
    const existingLoc = norm(issue.location);

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

function detectDuplicate(newIssue, existingIssues) {
  const res = detectDuplicatesWithReasons(newIssue, existingIssues);
  return res ? res.duplicate : null;
}

module.exports = {
  analyzeCategory,
  suggestCategory,
  normalizeCategory,
  computeSeverityDetails,
  computeSeverityScore,
  detectDuplicatesWithReasons,
  detectDuplicate
};


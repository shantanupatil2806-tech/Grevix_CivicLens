// frontend/src/data/sampleIssues.ts
import { Issue } from '../types';

export const sampleIssues: Issue[] = [
  {
    _id: 'demo-001',
    ticketCode: 'ANO-3426-456',
    title: 'Large pothole on MG Road near Bus Stop 12',
    description: 'Cracks and deep depression observed near the main intersection causing severe traffic disruptions and wheel rim damage.',
    category: 'Roads',
    location: '32, MG Road, Near Domino\'s, Tolichowki, Pincode- 534624',
    coordinates: { lat: 17.4065, lng: 78.4112 },
    severityScore: 85,
    priorityScore: 85,
    photos: [
      'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=500&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=500&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?w=500&auto=format&fit=crop&q=80'
    ],
    severityFactors: [
      'Base category priority for Roads: 35 pts',
      'High urgency terminology indicated (+15 pts)',
      'High public safety hazard detected (+20 pts)',
      'Near public transit route (+15 pts)'
    ],
    categoryReasons: ['pothole damage', 'roadway infrastructure'],
    status: 'In Progress',
    statusHistory: [
      {
        status: 'Reported',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        note: 'Reported by commuter with 3 photos',
        updatedBy: 'Citizen Reporter'
      },
      {
        status: 'Acknowledged',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        note: 'Inspection confirmed emergency road patching required',
        updatedBy: 'Municipal Road Engineer'
      },
      {
        status: 'In Progress',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        note: 'Emergency repair crew deployed on site with asphalt mixture',
        updatedBy: 'Public Works Dept'
      }
    ],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    isDemo: true,
  },
  {
    _id: 'demo-002',
    ticketCode: 'GRB-8910-102',
    title: 'Overflowing garbage bins near Central Market',
    description: 'Garbage bins have not been collected in 5 days. Severe stench and unsanitary spillage blocking footpath.',
    category: 'Garbage',
    location: 'Central Market Gate 1, Block A, Commercial Plaza',
    coordinates: { lat: 17.4120, lng: 78.4230 },
    severityScore: 65,
    priorityScore: 65,
    photos: [
      'https://images.unsplash.com/photo-1605600659908-0ef719419d41?w=500&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=500&auto=format&fit=crop&q=80'
    ],
    severityFactors: [
      'Base category priority for Garbage: 25 pts',
      'Active disruption condition (+10 pts)',
      'High volume waste accumulation (+30 pts)'
    ],
    categoryReasons: ['waste accumulation', 'overflowing waste bin', 'unsanitary odor'],
    status: 'Acknowledged',
    statusHistory: [
      {
        status: 'Reported',
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        note: 'Shopkeepers union logged unsanitary waste spillage',
        updatedBy: 'Citizen Reporter'
      },
      {
        status: 'Acknowledged',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        note: 'Sanitation supervisor scheduled hydraulic tipper truck',
        updatedBy: 'City Sanitation Agency'
      }
    ],
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    isDemo: true,
  },
  {
    _id: 'demo-003',
    ticketCode: 'WTR-4512-789',
    title: 'Water pipe leaking at Sector 4 Crossroads',
    description: 'Underground municipal potable line burst, continuous high pressure water stream washing away road foundation.',
    category: 'Water',
    location: 'Sector 4, Main Crossroads, Near Metro Pillar 114',
    coordinates: { lat: 17.4010, lng: 78.4350 },
    severityScore: 90,
    priorityScore: 90,
    photos: [
      'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=500&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=500&auto=format&fit=crop&q=80'
    ],
    severityFactors: [
      'Base category priority for Water: 45 pts',
      'Active disruption condition (+10 pts)',
      'High public safety hazard detected (+20 pts)',
      'Continuous potable water loss (+15 pts)'
    ],
    categoryReasons: ['pipe leakage', 'drainage or sewage overflow'],
    status: 'In Progress',
    statusHistory: [
      {
        status: 'Reported',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        note: 'Reported as high priority potable waterline break',
        updatedBy: 'Citizen Reporter'
      },
      {
        status: 'In Progress',
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        note: 'Excavation valve shutoff in progress to replace broken fitting',
        updatedBy: 'Water Board Engineer'
      }
    ],
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    isDemo: true,
  },
  {
    _id: 'demo-004',
    ticketCode: 'ELC-2098-331',
    title: 'Broken streetlight at Park View Lane',
    description: 'Three pole lights broken, dark stretch of road causing security concerns for evening pedestrians and college students.',
    category: 'Electricity',
    location: 'Park View Lane, Near Gate 2 Community Garden',
    coordinates: { lat: 17.4180, lng: 78.4050 },
    severityScore: 50,
    priorityScore: 50,
    photos: [
      'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=500&auto=format&fit=crop&q=80'
    ],
    severityFactors: [
      'Base category priority for Electricity: 50 pts'
    ],
    categoryReasons: ['streetlight failure'],
    status: 'Reported',
    statusHistory: [
      {
        status: 'Reported',
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        note: 'Neighborhood association logged lighting outage',
        updatedBy: 'Citizen Reporter'
      }
    ],
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    isDemo: true,
  },
  {
    _id: 'demo-005',
    ticketCode: 'ROD-9932-841',
    title: 'Road cave-in near City Hospital',
    description: 'Massive asphalt collapse right near the emergency ambulance entry zone. High accident vulnerability.',
    category: 'Roads',
    location: 'City Hospital Road, Critical Junction 9',
    coordinates: { lat: 17.3950, lng: 78.4200 },
    severityScore: 95,
    priorityScore: 95,
    photos: [
      'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?w=500&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=500&auto=format&fit=crop&q=80'
    ],
    severityFactors: [
      'Base category priority for Roads: 35 pts',
      'Near sensitive institution / emergency passage (+25 pts)',
      'High public safety hazard detected (+20 pts)',
      'High urgency terminology indicated (+15 pts)'
    ],
    categoryReasons: ['roadway infrastructure', 'traffic surface'],
    status: 'In Progress',
    statusHistory: [
      {
        status: 'Reported',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        note: 'Hospital paramedic flagged urgent ambulance obstruction',
        updatedBy: 'Emergency Services'
      },
      {
        status: 'In Progress',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        note: 'Structural reinforcement underway; traffic detour active',
        updatedBy: 'Urban Infrastructure Dept'
      }
    ],
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    isDemo: true,
  },
  {
    _id: 'demo-006',
    ticketCode: 'WTR-7714-552',
    title: 'Blocked drain causing waterlogging at Station Road',
    description: 'Sewer line clogged with industrial plastic debris. Dirty water accumulating over 2 feet deep near railway underpass.',
    category: 'Water',
    location: 'Station Road, Underpass Near Platform 1 Exit',
    coordinates: { lat: 17.4100, lng: 78.4410 },
    severityScore: 75,
    priorityScore: 75,
    photos: [
      'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=500&auto=format&fit=crop&q=80'
    ],
    severityFactors: [
      'Base category priority for Water: 45 pts',
      'Active disruption condition (+10 pts)',
      'Public transport proximity hazard (+15 pts)'
    ],
    categoryReasons: ['drainage or sewage overflow'],
    status: 'Reported',
    statusHistory: [
      {
        status: 'Reported',
        timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        note: 'Daily commuters logged severe waterlogging issue',
        updatedBy: 'Citizen Reporter'
      }
    ],
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    isDemo: true,
  },
  {
    _id: 'demo-007',
    ticketCode: 'ELC-6120-994',
    title: 'Hanging high-voltage wire at Sector 7',
    description: 'Damaged transformer insulation with sparking low-hanging wire right in front of residential apartments.',
    category: 'Electricity',
    location: 'Residential Block C, Sector 7, Avenue 4',
    coordinates: { lat: 17.4220, lng: 78.4190 },
    severityScore: 88,
    priorityScore: 88,
    photos: [
      'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=500&auto=format&fit=crop&q=80'
    ],
    severityFactors: [
      'Base category priority for Electricity: 50 pts',
      'Active disruption condition (+10 pts)',
      'High public safety hazard detected (+20 pts)'
    ],
    categoryReasons: ['electrical fault', 'exposed electrical hazard'],
    status: 'Acknowledged',
    statusHistory: [
      {
        status: 'Reported',
        timestamp: new Date(Date.now() - 0.5 * 24 * 60 * 60 * 1000).toISOString(),
        note: 'Urgent citizen alert about active sparking wire',
        updatedBy: 'Citizen Reporter'
      },
      {
        status: 'Acknowledged',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        note: 'Power cut enforced on feeder line 4, line repair crew assigned',
        updatedBy: 'State Electricity Board'
      }
    ],
    createdAt: new Date(Date.now() - 0.5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    isDemo: true,
  },
  {
    _id: 'demo-008',
    ticketCode: 'OTH-1102-445',
    title: 'Abandoned vehicle blocking fire exit at Market Square',
    description: 'Unregistered minivan left across designated emergency exit for 4 consecutive days.',
    category: 'Other',
    location: 'Market Square, Fire Exit Gate 3, South Wing',
    coordinates: { lat: 17.3990, lng: 78.4080 },
    severityScore: 65,
    priorityScore: 65,
    photos: [
      'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=500&auto=format&fit=crop&q=80'
    ],
    severityFactors: [
      'Base category priority for Other: 20 pts',
      'Near sensitive institution / emergency passage (+25 pts)',
      'High public safety hazard detected (+20 pts)'
    ],
    categoryReasons: ['No domain keywords detected; fallback to Other'],
    status: 'Resolved',
    statusHistory: [
      {
        status: 'Reported',
        timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        note: 'Mall security officer logged obstruction',
        updatedBy: 'Safety Officer'
      },
      {
        status: 'Resolved',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        note: 'Vehicle impounded by Traffic Division; exit verified clear',
        updatedBy: 'Traffic Enforcement'
      }
    ],
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    isDemo: true,
  },
];

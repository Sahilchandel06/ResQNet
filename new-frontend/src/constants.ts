import { SOSIncident, Volunteer, GovernanceProposal } from './types';

export const MOCK_INCIDENTS: SOSIncident[] = [
  {
    id: 'SOS-8821',
    title: 'Medical Emergency: Cardiac Arrest',
    location: 'Central Park, Sector 4',
    timestamp: '2026-03-21T16:45:00Z',
    priority: 'Critical',
    status: 'Active',
    description: 'Male, approx 55 years old, collapsed near the fountain. Bystander performing CPR.',
    callerName: 'Jane Doe',
    callerPhone: '+1 (555) 123-4567',
    coordinates: [23.0225, 72.5714], // Ahmedabad
    aiAnalysis: {
      type: 'Medical Emergency',
      priority: 'Critical',
      reasoning: 'Symptoms indicate cardiac arrest. Immediate advanced life support required.',
      suggestedAction: 'Dispatch ALS Unit 4 and alert nearest AED-equipped volunteer.'
    },
    transcript: [
      { speaker: 'Caller', text: 'Help! Someone just collapsed! He\'s not breathing!', timestamp: '16:45:02' },
      { speaker: 'Operator', text: 'Stay calm. Where exactly are you?', timestamp: '16:45:05' },
      { speaker: 'Caller', text: 'Central Park, right by the main fountain. Please hurry!', timestamp: '16:45:10' },
      { speaker: 'AI', text: 'Analyzing background noise... Gasping sounds detected. Agonal breathing confirmed.', timestamp: '16:45:12' }
    ]
  },
  {
    id: 'SOS-8822',
    title: 'Structure Fire: Residential',
    location: 'Oak Street, Building 12',
    timestamp: '2026-03-21T16:30:00Z',
    priority: 'Critical',
    status: 'Active',
    description: 'Smoke visible from 3rd floor window. Occupants may be trapped.',
    callerName: 'Robert Smith',
    callerPhone: '+1 (555) 987-6543',
    coordinates: [19.0760, 72.8777], // Mumbai
    aiAnalysis: {
      type: 'Fire Emergency',
      priority: 'Critical',
      reasoning: 'High risk of life loss in multi-story residential building.',
      suggestedAction: 'Dispatch Fire Engine 12 and Ladder 4. Evacuate adjacent units.'
    }
  },
  {
    id: 'SOS-8823',
    title: 'Traffic Accident: Multi-vehicle',
    location: 'Highway 101, Exit 14',
    timestamp: '2026-03-21T16:15:00Z',
    priority: 'Moderate',
    status: 'Pending',
    description: 'Three cars involved. Minor injuries reported, but blocking two lanes.',
    callerName: 'Sarah Wilson',
    callerPhone: '+1 (555) 456-7890',
    coordinates: [21.1702, 72.8311] // Surat
  }
];

export const MOCK_VOLUNTEERS: Volunteer[] = [
  {
    id: 'VOL-001',
    name: 'Alex Rivera',
    role: 'EMT-B / Drone Pilot',
    status: 'Active',
    location: 'Sector 4',
    coordinates: [23.1125, 72.5814], // Near Ahmedabad
    rating: 4.9,
    completedMissions: 142,
    joinDate: '2025-01-15'
  },
  {
    id: 'VOL-002',
    name: 'Elena Vance',
    role: 'Search & Rescue',
    status: 'On-Call',
    location: 'Sector 2',
    coordinates: [19.1760, 72.9777], // Near Mumbai
    rating: 4.8,
    completedMissions: 89,
    joinDate: '2025-03-10'
  },
  {
    id: 'VOL-003',
    name: 'Marcus Thorne',
    role: 'Firefighter / Heavy Ops',
    status: 'Offline',
    location: 'Sector 7',
    coordinates: [22.3072, 73.1812], // Vadodara
    rating: 5.0,
    completedMissions: 215,
    joinDate: '2024-11-20'
  }
];

export const MOCK_PROPOSALS: GovernanceProposal[] = [
  {
    id: 'PROP-112',
    title: 'Expand Drone Coverage to Sector 9',
    description: 'Proposal to allocate 5000 RESQ tokens for 3 new rapid-response drones in the industrial district.',
    status: 'Active',
    votesFor: 125000,
    votesAgainst: 12000,
    timeLeft: '2d 4h',
    author: 'Admin_Sarah',
    category: 'Infrastructure'
  },
  {
    id: 'PROP-111',
    title: 'Update EMT Training Protocols',
    description: 'Standardize trauma response based on the latest 2026 guidelines.',
    status: 'Passed',
    votesFor: 450000,
    votesAgainst: 5000,
    author: 'Dr_Holloway',
    category: 'Training'
  }
];

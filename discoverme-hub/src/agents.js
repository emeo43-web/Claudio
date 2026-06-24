export const AGENTS = [
  {
    id: 'pm',
    label: 'PM',
    fullLabel: 'Project Manager',
    color: '#1A3A6B',
    colorLight: '#1A3A6B20',
    emoji: '🧭',
  },
  {
    id: 'product',
    label: 'Designer',
    fullLabel: 'Product Designer',
    color: '#0F6E56',
    colorLight: '#0F6E5620',
    emoji: '🎨',
  },
  {
    id: 'growth',
    label: 'Growth',
    fullLabel: 'Growth & Marketing',
    color: '#993C1D',
    colorLight: '#993C1D20',
    emoji: '📈',
  },
  {
    id: 'institutional',
    label: 'Istituzionale',
    fullLabel: 'Relazioni Istituzionali',
    color: '#185FA5',
    colorLight: '#185FA520',
    emoji: '🏛️',
  },
  {
    id: 'tech',
    label: 'Tech',
    fullLabel: 'Tech Advisor',
    color: '#3C3489',
    colorLight: '#3C348920',
    emoji: '⚙️',
  },
]

export const getAgent = (id) => AGENTS.find((a) => a.id === id)

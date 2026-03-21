const CRITICAL_KEYWORDS = ['bleeding', 'unconscious', 'heart attack', 'not breathing', 'fire', 'explosion']
const HIGH_KEYWORDS = ['accident', 'injury', 'crime', 'attack', 'collapsed', 'urgent']
const SPAM_KEYWORDS = ['prank', 'fake', 'test only', 'just kidding', 'spam']

const analyzeSOS = ({ message, type }) => {
  const content = `${message} ${type}`.toLowerCase()

  let priority = 'Low'

  if (CRITICAL_KEYWORDS.some((keyword) => content.includes(keyword)) || type === 'Medical') {
    priority = 'Critical'
  } else if (HIGH_KEYWORDS.some((keyword) => content.includes(keyword)) || ['Fire', 'Accident', 'Crime'].includes(type)) {
    priority = 'High'
  } else if (type === 'Disaster' || type === 'Other') {
    priority = 'Medium'
  }

  const suspicious = SPAM_KEYWORDS.some((keyword) => content.includes(keyword))

  return {
    priority,
    suspicious,
    analysisSummary: suspicious
      ? 'The request looks suspicious based on keyword heuristics.'
      : `Priority tagged as ${priority} using the current rule-based emergency classifier.`,
  }
}

module.exports = {
  analyzeSOS,
}

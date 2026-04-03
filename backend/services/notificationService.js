const axios = require('axios')
const { normalizePhoneToE164 } = require('../utils/phone')

const hasTwilioMessagingConfig = () =>
  Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    (process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_MESSAGING_SERVICE_SID),
  )

const buildAssignmentMessage = ({ sos, volunteerName }) => {
  const lines = [
    `ResQNet SOS #${sos.sequenceId}`,
    `Volunteer: ${volunteerName || sos.assignedVolunteer?.name || 'Assigned'}`,
    `Type: ${sos.type}`,
    `Priority: ${sos.priority}`,
    `Location: ${sos.location || 'Unknown'}`,
  ]

  const trimmedMessage = (sos.message || '').trim()
  if (trimmedMessage) {
    const excerpt = trimmedMessage.length > 120
      ? `${trimmedMessage.slice(0, 117)}...`
      : trimmedMessage
    lines.push(`Details: ${excerpt}`)
  }

  return lines.join('\n')
}

const sendAssignmentSms = async ({ to, volunteerName, sos }) => {
  if (!hasTwilioMessagingConfig()) {
    return {
      sent: false,
      reason: 'Twilio messaging environment variables are not fully configured.',
    }
  }

  const normalizedTo = normalizePhoneToE164(to || '')
  if (!normalizedTo) {
    return {
      sent: false,
      reason: 'Volunteer phone number is missing.',
    }
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const body = buildAssignmentMessage({ sos, volunteerName })
  const params = new URLSearchParams({
    To: normalizedTo,
    Body: body,
  })

  if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
    params.append('MessagingServiceSid', process.env.TWILIO_MESSAGING_SERVICE_SID)
  } else {
    params.append('From', normalizePhoneToE164(process.env.TWILIO_FROM_NUMBER || ''))
  }

  try {
    const response = await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      params,
      {
        auth: {
          username: accountSid,
          password: authToken,
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 15000,
      },
    )

    return {
      sent: true,
      sid: response.data?.sid || null,
    }
  } catch (error) {
    const twilioCode = error.response?.data?.code
    const reason =
      error.response?.data?.message ||
      error.response?.data?.detail ||
      error.message ||
      'Twilio SMS send failed.'

    return {
      sent: false,
      reason: twilioCode ? `${reason} (Twilio code ${twilioCode})` : reason,
    }
  }
}

module.exports = {
  hasTwilioMessagingConfig,
  sendAssignmentSms,
}

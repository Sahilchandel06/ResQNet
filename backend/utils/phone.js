const E164_PHONE_REGEX = /^\+[1-9]\d{7,14}$/

const normalizePhoneToE164 = (value = '') =>
  value
    .trim()
    .replace(/[\s()-]/g, '')

const isE164Phone = (value = '') => E164_PHONE_REGEX.test(normalizePhoneToE164(value))

module.exports = {
  E164_PHONE_REGEX,
  normalizePhoneToE164,
  isE164Phone,
}

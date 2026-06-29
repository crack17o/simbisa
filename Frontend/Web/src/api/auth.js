import { apiRequest } from './client'
import { getDeviceId } from '@/utils/device'

export function loginApi(telephone, password, { otp_code, device_id, country } = {}) {
  const body = {
    telephone: telephone.replace(/\s/g, ''),
    password,
    device_id: device_id || getDeviceId(),
  }
  if (otp_code) body.otp_code = otp_code
  if (country) body.country = country
  return apiRequest('/api/v1/auth/login/', { method: 'POST', body, auth: false })
}

export function registerApi(data) {
  return apiRequest('/api/v1/auth/register/', {
    method: 'POST',
    auth: false,
    body: {
      telephone: data.telephone.replace(/\s/g, ''),
      nom: data.nom,
      postnom: data.postnom || '',
      prenom: data.prenom,
      email: data.email || '',
      commune_kinshasa: data.commune_kinshasa,
      password: data.password,
      password_confirm: data.password_confirm,
    },
  })
}

export function logoutApi(refreshToken) {
  return apiRequest('/api/v1/auth/logout/', {
    method: 'POST',
    body: { refresh: refreshToken },
  })
}

export function meApi() {
  return apiRequest('/api/v1/auth/me/')
}

export function forgotPasswordApi(email) {
  return apiRequest('/api/v1/auth/password/forgot/', {
    method: 'POST',
    auth: false,
    body: { email },
  })
}

export function verifyResetOtpApi(email, otp_code) {
  return apiRequest('/api/v1/auth/password/verify-otp/', {
    method: 'POST',
    auth: false,
    body: { email, otp_code },
  })
}

export function resetPasswordApi({ email, reset_token, new_password, new_password_confirm }) {
  return apiRequest('/api/v1/auth/password/reset/', {
    method: 'POST',
    auth: false,
    body: { email, reset_token, new_password, new_password_confirm },
  })
}

export function mfaSetupApi() {
  return apiRequest('/api/v1/auth/mfa/setup/', { method: 'POST', body: {} })
}

export function mfaVerifyApi(otp_token) {
  return apiRequest('/api/v1/auth/mfa/verify/', { method: 'POST', body: { otp_token } })
}

export function changePasswordApi({ old_password, new_password, new_password_confirm }) {
  return apiRequest('/api/v1/auth/change-password/', {
    method: 'POST',
    body: { old_password, new_password, new_password_confirm },
  })
}

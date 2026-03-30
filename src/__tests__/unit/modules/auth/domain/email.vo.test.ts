import { describe, it, expect } from 'vitest'
import { Email } from '@/modules/auth/domain/value-objects/email.vo'

describe('Email Value Object', () => {
  it('should create a valid email', () => {
    const emailRes = Email.create('test@example.com')
    expect(emailRes.ok).toBe(true)
    if (emailRes.ok) {
      expect(emailRes.value.value).toBe('test@example.com')
    }
  })

  it('should normalize email to lowercase', () => {
    const emailRes = Email.create('TEST@EXAMPLE.COM')
    expect(emailRes.ok).toBe(true)
    if (emailRes.ok) {
      expect(emailRes.value.value).toBe('test@example.com')
    }
  })

  it('should fail if email is invalid', () => {
    const emailRes = Email.create('invalid-email')
    expect(emailRes.ok).toBe(false)
  })
})

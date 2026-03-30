import { describe, it, expect } from 'vitest'
import { User } from '@/modules/auth/domain/entities/user.entity'
import { Email } from '@/modules/auth/domain/value-objects/email.vo'

describe('User Entity', () => {
  it('should create a valid user', () => {
    const emailRes = Email.create('test@example.com')
    if (!emailRes.ok) throw new Error('Invalid email')
    
    const user = new User({
      id: '123',
      email: emailRes.value,
      fullName: 'Test User',
      avatarUrl: 'https://example.com/avatar.png',
    })

    expect(user.id).toBe('123')
    expect(user.email.value).toBe('test@example.com')
    expect(user.fullName).toBe('Test User')
    expect(user.avatarUrl).toBe('https://example.com/avatar.png')
  })
})

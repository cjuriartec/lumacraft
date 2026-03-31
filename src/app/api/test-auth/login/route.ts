import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

function isTestAuthEnabled() {
  return process.env.NODE_ENV === 'test' || process.env.ENABLE_TEST_AUTH === 'true'
}

export async function POST(request: Request) {
  if (!isTestAuthEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { email, password } = (await request.json()) as {
    email?: string
    password?: string
  }

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }

  const response = NextResponse.json({ ok: true })
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set({ name, value, ...options })
            response.cookies.set({ name, value, ...options })
          }
        },
      },
    }
  )

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  return response
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/shared/infrastructure/supabase/server'
import { EagerLoadRecordUseCase } from '@/modules/collection/application/use-cases/eager-load-record.use-case'

interface RouteParams {
  params: Promise<{
    id: string
    recordId: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: collectionId, recordId } = await params
  const supabase = await createClient()

  // Auth check
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse depth from query params
  const depthParam = request.nextUrl.searchParams.get('depth')
  const depth = depthParam ? Math.min(parseInt(depthParam, 10), 5) : 2

  const useCase = new EagerLoadRecordUseCase(supabase)
  const result = await useCase.execute({
    recordId,
    collectionId,
    depth,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error.message }, { status: 400 })
  }

  return NextResponse.json(result.value)
}

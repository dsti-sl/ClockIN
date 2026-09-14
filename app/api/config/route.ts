import { NextResponse } from 'next/server'

const DEFAULT_MAX_DISTANCE = 150

export async function GET() {
  const parsed = Number(process.env.GEOFENCE_MAX_DISTANCE)
  const geoFenceMaxDistance =
    Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_DISTANCE
  return NextResponse.json({ geoFenceMaxDistance })
}

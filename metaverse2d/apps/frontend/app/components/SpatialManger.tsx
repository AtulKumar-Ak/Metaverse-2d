//frontend/app/components/SpatialManger.tsx

const PROXIMITY_THRESHOLD = 5;
const MAX_VOLUME_DISTANCE = 1;  // full volume when 1 tile away

export interface Player {
  userId: string;
  x: number;
  y: number;
}

export function getDistance(p1: Player, p2: Player): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function isNear(p1: Player, p2: Player): boolean {
  return getDistance(p1, p2) < PROXIMITY_THRESHOLD;
}

// Returns 0.0–1.0 based on proximity (closer = louder)
export function getProximityVolume(p1: Player, p2: Player): number {
  const dist = getDistance(p1, p2);
  if (dist >= PROXIMITY_THRESHOLD) return 0;
  if (dist <= MAX_VOLUME_DISTANCE) return 1;
  // Linear fade between MAX_VOLUME_DISTANCE and PROXIMITY_THRESHOLD
  return 1 - (dist - MAX_VOLUME_DISTANCE) / (PROXIMITY_THRESHOLD - MAX_VOLUME_DISTANCE);
}
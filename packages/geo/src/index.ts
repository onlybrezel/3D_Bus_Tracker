export interface GeoPoint { latitude: number; longitude: number }
export interface Bounds { west: number; south: number; east: number; north: number }

const radians = (degrees: number) => degrees * Math.PI / 180;
const degrees = (radiansValue: number) => radiansValue * 180 / Math.PI;

export function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  const radius = 6_371_000;
  const dLat = radians(b.latitude - a.latitude);
  const dLon = radians(b.longitude - a.longitude);
  const lat1 = radians(a.latitude);
  const lat2 = radians(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function bearingDegrees(a: GeoPoint, b: GeoPoint): number {
  const lat1 = radians(a.latitude);
  const lat2 = radians(b.latitude);
  const lon = radians(b.longitude - a.longitude);
  const y = Math.sin(lon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon);
  return (degrees(Math.atan2(y, x)) + 360) % 360;
}

export function interpolate(a: GeoPoint, b: GeoPoint, progress: number): GeoPoint {
  const t = Math.max(0, Math.min(1, progress));
  return { latitude: a.latitude + (b.latitude - a.latitude) * t, longitude: a.longitude + (b.longitude - a.longitude) * t };
}

export function contains(bounds: Bounds, point: GeoPoint): boolean {
  const longitudeInside = bounds.west <= bounds.east
    ? point.longitude >= bounds.west && point.longitude <= bounds.east
    : point.longitude >= bounds.west || point.longitude <= bounds.east;
  return longitudeInside && point.latitude >= bounds.south && point.latitude <= bounds.north;
}

export function padBounds(bounds: Bounds, ratio = 0.15): Bounds {
  const latPadding = (bounds.north - bounds.south) * ratio;
  const lonWidth = bounds.east >= bounds.west ? bounds.east - bounds.west : 360 - bounds.west + bounds.east;
  const lonPadding = lonWidth * ratio;
  return { south: Math.max(-90, bounds.south - latPadding), north: Math.min(90, bounds.north + latPadding), west: Math.max(-180, bounds.west - lonPadding), east: Math.min(180, bounds.east + lonPadding) };
}

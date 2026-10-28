type Coordinates = { latitude?: number | null; longitude?: number | null };

export function validCoordinates(value?: Coordinates | null): value is { latitude: number; longitude: number } {
  return typeof value?.latitude === "number" && typeof value.longitude === "number"
    && Number.isFinite(value.latitude) && Number.isFinite(value.longitude)
    && Math.abs(value.latitude) <= 90 && Math.abs(value.longitude) <= 180;
}

export function nearbyDirectionsUrl(origin?: Coordinates | null, destination?: Coordinates | null): string | null {
  if (!validCoordinates(origin) || !validCoordinates(destination)) return null;
  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set("origin", `${origin.latitude},${origin.longitude}`);
  url.searchParams.set("destination", `${destination.latitude},${destination.longitude}`);
  return url.toString();
}

export function currentLocationDirectionsUrl(destination?: Coordinates | null): string | null {
  if (!validCoordinates(destination)) return null;
  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  // Omitting origin lets Google Maps resolve the device's current location.
  url.searchParams.set("destination", `${destination.latitude},${destination.longitude}`);
  url.searchParams.set("dir_action", "navigate");
  return url.toString();
}

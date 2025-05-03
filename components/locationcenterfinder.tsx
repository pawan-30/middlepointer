"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, MapPin, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Map, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";

interface Location {
  address: string;
  fullAddress: string;
  lat: number;
  lon: number;
}

interface CenterLocation {
  lat: number;
  lon: number;
  address?: string;
}

export function LocationCenterFinder() {
  const [locations, setLocations] = useState<string>("");
  const [cityContext, setCityContext] = useState<string>("");
  const [geocodedLocations, setGeocodedLocations] = useState<Location[]>([]);
  const [centerLocation, setCenterLocation] = useState<CenterLocation | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const centerMarkerRef = useRef<Marker | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && mapRef.current && !mapInstanceRef.current) {
      import("leaflet").then((L) => {
        if (mapRef.current) {
          const map = L.map(mapRef.current).setView([40, -95], 4);
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          }).addTo(map);
          mapInstanceRef.current = map;
        }
      });
    }
  }, []);

  useEffect(() => {
    if (mapInstanceRef.current && geocodedLocations.length > 0) {
      import("leaflet").then((L) => {
        markersRef.current.forEach((marker: Marker) => marker.remove());
        markersRef.current = [];

        const bounds = L.latLngBounds([]);
        geocodedLocations.forEach((location: Location) => {
          const marker = L.marker([location.lat, location.lon])
            .addTo(mapInstanceRef.current!)
            .bindPopup(`<strong>${location.address}</strong><br>${location.fullAddress}`);
          markersRef.current.push(marker);
          bounds.extend([location.lat, location.lon]);
        });

        if (bounds.isValid()) {
          mapInstanceRef.current!.fitBounds(bounds, { padding: [50, 50] });
        }
      });
    }
  }, [geocodedLocations]);

  useEffect(() => {
    if (mapInstanceRef.current && centerLocation) {
      import("leaflet").then((L) => {
        if (centerMarkerRef.current) {
          centerMarkerRef.current.remove();
        }

        const centerIcon = L.divIcon({
          html: `<div class="center-marker"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="text-red-500"><circle cx="12" cy="10" r="3"/><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z"/></svg></div>`,
          className: "center-marker-container",
          iconSize: [30, 30],
          iconAnchor: [15, 30],
        });

        centerMarkerRef.current = L.marker([centerLocation.lat, centerLocation.lon], { icon: centerIcon })
          .addTo(mapInstanceRef.current!)
          .bindPopup(centerLocation.address || "Center Location")
          .openPopup();
      });
    }
  }, [centerLocation]);

  const geocodeAddress = async (address: string): Promise<Location | null> => {
    try {
      let searchAddress = address.trim();
      if (cityContext && !searchAddress.toLowerCase().includes(cityContext.toLowerCase())) {
        searchAddress = `${searchAddress}, ${cityContext}`;
      }

      const encodedAddress = encodeURIComponent(searchAddress);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&addressdetails=1`
      );

      if (!response.ok) {
        throw new Error(`Geocoding failed for address: ${address}`);
      }

      const data = await response.json();
      if (data.length === 0) {
        throw new Error(`No results found for address: ${address}`);
      }

      if (cityContext && data[0].address) {
        const resultCity =
          data[0].address.city || data[0].address.town || data[0].address.county || data[0].address.state;
        const cityContextLower = cityContext.toLowerCase();
        const resultCityLower = resultCity ? resultCity.toLowerCase() : "";

        if (
          !resultCityLower.includes(cityContextLower.split(",")[0]) &&
          !data[0].display_name.toLowerCase().includes(cityContextLower)
        ) {
          setWarnings((prev: string[]) => [
            ...prev,
            `Warning: Result for "${address}" may be outside the specified city context.`,
          ]);
        }
      }

      return {
        address: address.trim(),
        fullAddress: data[0].display_name,
        lat: Number.parseFloat(data[0].lat),
        lon: Number.parseFloat(data[0].lon),
      };
    } catch (error) {
      console.error(`Error geocoding address "${address}":`, error);
      return null;
    }
  };

  const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14`
      );

      if (!response.ok) {
        throw new Error(`Reverse geocoding failed`);
      }

      const data = await response.json();
      if (!data || !data.display_name) {
        throw new Error(`No results found for coordinates`);
      }

      return data.display_name;
    } catch (error) {
      console.error(`Error reverse geocoding:`, error);
      return "Unknown location";
    }
  };

  const calculateCenterLocation = (locations: Location[]): CenterLocation => {
    if (cityContext && locations.length > 2) {
      const cityContextLower = cityContext.toLowerCase();
      const cityLocations = locations.filter((loc) => loc.fullAddress.toLowerCase().includes(cityContextLower));

      if (cityLocations.length >= 2) {
        locations = cityLocations;
      }
    }

    const radians = locations.map((loc) => ({
      lat: (loc.lat * Math.PI) / 180,
      lon: (loc.lon * Math.PI) / 180,
    }));

    let x = 0;
    let y = 0;
    let z = 0;

    for (const coord of radians) {
      x += Math.cos(coord.lat) * Math.cos(coord.lon);
      y += Math.cos(coord.lat) * Math.sin(coord.lon);
      z += Math.sin(coord.lat);
    }

    x /= radians.length;
    y /= radians.length;
    z /= radians.length;

    const lon = Math.atan2(y, x);
    const hyp = Math.sqrt(x * x + y * y);
    const lat = Math.atan2(z, hyp);

    return {
      lat: (lat * 180) / Math.PI,
      lon: (lon * 180) / Math.PI,
    };
  };

  const handleFindCenter = async () => {
    setError(null);
    setWarnings([]);
    setLoading(true);

    try {
      const addressList = locations
        .split(/[\n,]+/)
        .map((addr: string) => addr.trim())
        .filter((addr: string) => addr.length > 0);

      if (addressList.length < 2) {
        throw new Error("Please enter at least two locations");
      }

      const geocodedResults: Location[] = [];
      for (const address of addressList) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const result = await geocodeAddress(address);
        if (result) {
          geocodedResults.push(result);
        }
      }

      if (geocodedResults.length < 2) {
        throw new Error("Could not geocode enough valid addresses. Please check your input.");
      }

      setGeocodedLocations(geocodedResults);
      const center = calculateCenterLocation(geocodedResults);
      const centerAddress = await reverseGeocode(center.lat, center.lon);
      setCenterLocation({
        ...center,
        address: centerAddress,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred while processing your request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <Card className="shadow-md border-0">
          <CardContent className="pt-6">
            <div className="space-y-5">
              <div>
                <label htmlFor="locations" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  Enter Locations
                </label>
                <Textarea
                  id="locations"
                  placeholder="Enter locations separated by commas or new lines
Example:
Connaught Place, Delhi
Lajpat Nagar, Delhi
Karol Bagh, Delhi"
                  className="min-h-[180px] resize-none border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500"
                  value={locations}
                  onChange={(e) => setLocations(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="cityContext" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  City Context
                </label>
                <Input
                  id="cityContext"
                  type="text"
                  placeholder="e.g. Delhi, India"
                  className="border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500"
                  value={cityContext}
                  onChange={(e) => setCityContext(e.target.value)}
                />
                <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                  Add city name for more accurate results
                </p>
              </div>

              <Button
                onClick={handleFindCenter}
                disabled={loading || !locations.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Finding Center...
                  </>
                ) : (
                  <>
                    <MapPin className="mr-2 h-4 w-4" />
                    Find Center Location
                  </>
                )}
              </Button>

              {error && (
                <Alert
                  variant="destructive"
                  className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300"
                >
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {warnings.length > 0 && (
                <Alert className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                  <Info className="h-4 w-4 text-amber-500" />
                  <AlertDescription>
                    <div className="text-sm text-amber-600 dark:text-amber-400">
                      {warnings.map((warning: string, index: number) => (
                        <p key={index}>{warning}</p>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {centerLocation && (
                <div className="p-5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                  <h3 className="font-medium text-gray-800 dark:text-gray-100 mb-2">Center Location:</h3>
                  <p className="font-medium text-gray-900 dark:text-gray-50 mb-2">{centerLocation.address || "Location found"}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Coordinates: {centerLocation.lat.toFixed(6)}, {centerLocation.lon.toFixed(6)}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <Card className="h-full shadow-md border-0">
          <CardContent className="p-0 h-full">
            <div
              ref={mapRef}
              className="w-full h-[500px] rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
            >
              <div className="text-center text-gray-500 dark:text-gray-400">
                <MapPin className="h-6 w-6 mr-2 text-gray-600 mt-1 hover:text-gray-800 transition-colors duration-200" />
                <p>{centerLocation ? "Map view" : "Enter locations to see the map"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {geocodedLocations.length > 0 && (
        <div className="lg:col-span-2">
          <Card className="shadow-md border-0">
            <CardContent className="pt-6">
              <h3 className="font-medium text-gray-800 dark:text-gray-100 mb-4">Geocoded Locations</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {geocodedLocations.map((loc: Location, index: number) => (
                  <div key={index} className="flex items-start p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <MapPin className="h-5 w-5 mr-3 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-800 dark:text-gray-200">{loc.address}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{loc.fullAddress}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        Lat: {loc.lat.toFixed(6)}, Lon: {loc.lon.toFixed(6)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
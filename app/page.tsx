
import { LocationCenterFinder } from "../components/locationcenterfinder";
import { ThemeToggle } from "@/components/theme-toggle";
import { MapPin } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen p-4 md:p-8 bg-background">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 gap-4">
          <div className="space-y-2">
            <div className="flex items-center">
              <MapPin className="h-8 w-8 mr-3 text-blue-600 dark:text-blue-400" />
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">Location Center Finder</h1>
            </div>
            <p className="text-muted-foreground text-lg md:pl-11">
              Find the optimal meeting point equidistant from multiple locations.
            </p>
          </div>
          <ThemeToggle />
        </div>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-lg p-4 mb-8">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Enter multiple locations separated by commas or new lines to find the central point that minimizes travel distance for everyone.
          </p>
        </div>
        
        <LocationCenterFinder />
        
        <footer className="mt-12 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Location Center Finder. All rights reserved.</p>
        </footer>
      </div>
    </main>
  );
}
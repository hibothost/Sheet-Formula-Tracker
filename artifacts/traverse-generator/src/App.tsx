import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import React, { useState } from 'react';
import { Plus, Trash2, Download, FileSpreadsheet, Ruler, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const queryClient = new QueryClient();

interface Station {
  id: string;
  name: string;
  northing: string;
  easting: string;
}

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

function Home() {
  const { toast } = useToast();
  const [stations, setStations] = useState<Station[]>([
    { id: generateId(), name: '', northing: '', easting: '' },
    { id: generateId(), name: '', northing: '', easting: '' },
  ]);
  const [isGenerating, setIsGenerating] = useState(false);

  const addStation = () => {
    setStations([...stations, { id: generateId(), name: '', northing: '', easting: '' }]);
  };

  const removeStation = (id: string) => {
    setStations(stations.filter(s => s.id !== id));
  };

  const updateStation = (id: string, field: keyof Station, value: string) => {
    setStations(stations.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const validate = () => {
    if (stations.length < 2) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'At least 2 traverse stations are required.',
      });
      return false;
    }

    for (let i = 0; i < stations.length; i++) {
      const s = stations[i];
      if (!s.name.trim()) {
        toast({
          variant: 'destructive',
          title: 'Validation Error',
          description: `Station ${i + 1} is missing a name.`,
        });
        return false;
      }
      if (s.northing.trim() === '' || isNaN(Number(s.northing))) {
        toast({
          variant: 'destructive',
          title: 'Validation Error',
          description: `Station ${i + 1} has an invalid Northing value.`,
        });
        return false;
      }
      if (s.easting.trim() === '' || isNaN(Number(s.easting))) {
        toast({
          variant: 'destructive',
          title: 'Validation Error',
          description: `Station ${i + 1} has an invalid Easting value.`,
        });
        return false;
      }
    }
    return true;
  };

  const handleGenerate = async () => {
    if (!validate()) return;

    setIsGenerating(true);
    try {
      const payload = {
        stations: stations.map(s => ({
          name: s.name.trim(),
          northing: Number(s.northing),
          easting: Number(s.easting),
        })),
      };

      const response = await fetch(`${import.meta.env.BASE_URL}api/traverse/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMsg = 'Failed to generate field notes.';
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMsg = errorData.error;
          }
        } catch (e) {
          // Response isn't JSON
        }
        throw new Error(errorMsg);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'traverse-field-notes.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Success',
        description: 'Field notes generated and downloaded.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col p-4 md:p-8">
      <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col gap-8">
        
        <header className="flex flex-col md:flex-row md:items-end justify-between border-b border-border pb-6 gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary mb-2">
              <Compass className="w-6 h-6" />
              <Ruler className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground uppercase">
              Traverse Calculator
            </h1>
            <p className="text-muted-foreground font-mono text-sm mt-1 uppercase tracking-wider">
              Field Notes generation utility // v1.0
            </p>
          </div>
          
          <Button 
            size="lg" 
            onClick={handleGenerate} 
            disabled={isGenerating}
            className="font-mono uppercase tracking-wider gap-2 min-w-[240px]"
          >
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                Computing...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                Generate & Download
              </span>
            )}
          </Button>
        </header>

        <main className="flex-1 bg-card border border-border shadow-sm rounded-md overflow-hidden flex flex-col">
          <div className="bg-muted border-b border-border p-4 flex items-center justify-between">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <span className="w-2 h-2 bg-primary rounded-full"></span>
              STATION DATA ENTRY
            </h2>
            <div className="text-xs text-muted-foreground font-mono uppercase">
              {stations.length} Station{stations.length !== 1 ? 's' : ''}
            </div>
          </div>
          
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="p-3 text-xs font-mono text-muted-foreground uppercase tracking-wider w-16 text-center">ID</th>
                  <th className="p-3 text-xs font-mono text-muted-foreground uppercase tracking-wider w-1/3">Station Name</th>
                  <th className="p-3 text-xs font-mono text-muted-foreground uppercase tracking-wider w-1/3">Northing (m)</th>
                  <th className="p-3 text-xs font-mono text-muted-foreground uppercase tracking-wider w-1/3">Easting (m)</th>
                  <th className="p-3 text-xs font-mono text-muted-foreground uppercase tracking-wider w-16 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {stations.map((station, index) => (
                  <tr key={station.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="p-3 text-center text-sm font-mono text-muted-foreground">
                      {(index + 1).toString().padStart(2, '0')}
                    </td>
                    <td className="p-3">
                      <Input
                        value={station.name}
                        onChange={(e) => updateStation(station.id, 'name', e.target.value)}
                        placeholder="e.g. STN 1"
                        className="font-mono bg-transparent border-transparent hover:border-input focus:bg-background"
                      />
                    </td>
                    <td className="p-3">
                      <Input
                        type="number"
                        step="any"
                        value={station.northing}
                        onChange={(e) => updateStation(station.id, 'northing', e.target.value)}
                        placeholder="0.000"
                        className="font-mono bg-transparent border-transparent hover:border-input focus:bg-background"
                      />
                    </td>
                    <td className="p-3">
                      <Input
                        type="number"
                        step="any"
                        value={station.easting}
                        onChange={(e) => updateStation(station.id, 'easting', e.target.value)}
                        placeholder="0.000"
                        className="font-mono bg-transparent border-transparent hover:border-input focus:bg-background"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeStation(station.id)}
                        disabled={stations.length <= 2}
                        className="text-muted-foreground hover:text-destructive"
                        title={stations.length <= 2 ? "Minimum 2 stations required" : "Remove station"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 border-t border-border bg-muted/20 flex justify-center">
            <Button 
              variant="outline" 
              onClick={addStation}
              className="font-mono text-sm uppercase tracking-wider border-dashed hover:border-primary hover:text-primary transition-colors w-full max-w-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Next Station
            </Button>
          </div>
        </main>
        
        <footer className="text-center text-xs text-muted-foreground font-mono uppercase pb-8">
          Standard closed traverse computation / Bowditch adjustment not applied at this stage
        </footer>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight text-foreground uppercase">404</h1>
        <p className="text-muted-foreground font-mono">System module not found.</p>
        <Button asChild variant="outline" className="mt-4 font-mono uppercase">
          <a href={import.meta.env.BASE_URL}>Return to System</a>
        </Button>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

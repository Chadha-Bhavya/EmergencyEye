import { X, Clock, MapPin, FileText, Play, Calendar, Download, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PastStreamInfo } from "@/hooks/useDashboard";
import { signalingConfig } from "@/lib/signalingConfig";

interface PastStreamViewerProps {
  stream: PastStreamInfo;
  onClose: () => void;
  onDelete: () => void;
}

export function PastStreamViewer({ stream, onClose, onDelete }: PastStreamViewerProps) {
  const videoUrl = `${signalingConfig.httpBase}${stream.video_url}`;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatTimestamp = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `stream-${stream.id}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4 bg-zinc-900">
          <div className="flex items-center gap-3">
            <Badge className="bg-zinc-700 text-zinc-200 text-xs font-semibold px-2 py-1 gap-1.5 border-0">
              <Play className="h-3 w-3" />
              RECORDED
            </Badge>
            <h2 className="text-xl font-bold text-white">Stream: {stream.id.substring(0, 12)}...</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleDownload}
              className="text-zinc-400 hover:text-white hover:bg-zinc-800 gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onDelete}
              className="text-red-400 hover:text-red-300 hover:bg-red-900/30 gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 p-6 overflow-auto bg-zinc-950">
          <div className="grid gap-6 lg:grid-cols-3 h-full">
            {/* Video player - takes up 2 columns */}
            <div className="lg:col-span-2">
              <Card className="overflow-hidden border-zinc-800 bg-zinc-900 h-full">
                <CardHeader className="border-b border-zinc-800 pb-3 bg-zinc-900">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Play className="h-5 w-5 text-blue-500" />
                      <CardTitle className="text-lg font-semibold text-white">
                        Recorded Stream
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-2 rounded-full bg-zinc-800 border border-zinc-700 px-3 py-1.5">
                      <Clock className="h-4 w-4 text-zinc-400" />
                      <span className="font-mono text-sm font-bold text-white">
                        {formatDuration(stream.duration_seconds)}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0 h-[calc(100%-60px)]">
                  <div className="relative h-full min-h-[400px] bg-black">
                    <video
                      src={videoUrl}
                      controls
                      className="h-full w-full object-contain"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Metadata panel */}
            <div className="space-y-4">
              <Card className="border-zinc-800 bg-zinc-900">
                <CardHeader className="pb-3 bg-zinc-900">
                  <CardTitle className="flex items-center gap-2 text-base text-white">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    Stream Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 bg-zinc-900">
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Stream ID
                    </p>
                    <p className="font-mono text-sm text-zinc-300">{stream.id}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Started At
                    </p>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-zinc-500" />
                      <p className="text-sm text-zinc-300">{formatTimestamp(stream.started_at)}</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Ended At
                    </p>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-zinc-500" />
                      <p className="text-sm text-zinc-300">{formatTimestamp(stream.ended_at)}</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Duration
                    </p>
                    <p className="font-mono text-lg font-bold text-blue-500">
                      {formatDuration(stream.duration_seconds)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-zinc-800 bg-zinc-900">
                <CardHeader className="pb-3 bg-zinc-900">
                  <CardTitle className="flex items-center gap-2 text-base text-white">
                    <MapPin className="h-4 w-4 text-blue-500" />
                    Location
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 bg-zinc-900">
                  {/* Always show coordinates in separate boxes */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-zinc-800 border border-zinc-700 p-2">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 mb-1">
                        Latitude
                      </p>
                      <p className="font-mono text-sm text-zinc-300">
                        {stream.latitude.toFixed(6)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-zinc-800 border border-zinc-700 p-2">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 mb-1">
                        Longitude
                      </p>
                      <p className="font-mono text-sm text-zinc-300">
                        {stream.longitude.toFixed(6)}
                      </p>
                    </div>
                  </div>
                  {(stream.latitude !== 0 || stream.longitude !== 0) ? (
                    <a 
                      href={`https://www.google.com/maps?q=${stream.latitude},${stream.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <div className="aspect-video rounded-lg overflow-hidden border border-zinc-700 relative group">
                        <img
                          src={`https://static-maps.yandex.ru/1.x/?ll=${stream.longitude},${stream.latitude}&z=15&l=map&size=400,300&pt=${stream.longitude},${stream.latitude},pm2rdl`}
                          alt="Location map"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                          <span className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                            Open in Google Maps
                          </span>
                        </div>
                      </div>
                    </a>
                  ) : (
                    <div className="aspect-video rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                      <div className="text-center">
                        <MapPin className="mx-auto h-8 w-8 text-zinc-600" />
                        <p className="mt-2 text-xs text-zinc-500">No location data</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {stream.notes && stream.notes.trim() !== "" && (
                <Card className="border-zinc-800 bg-zinc-900">
                  <CardHeader className="pb-3 bg-zinc-900">
                    <CardTitle className="flex items-center gap-2 text-base text-white">
                      <FileText className="h-4 w-4 text-amber-500" />
                      Additional Context
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="bg-zinc-900">
                    <div className="rounded-lg bg-amber-600/10 border border-amber-500/30 p-3">
                      <p className="text-sm leading-relaxed text-zinc-300">{stream.notes}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { X, Clock, MapPin, FileText, Radio, Wifi, WifiOff } from "lucide-react";
import { LiveIndicator } from "@/components/LiveIndicator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { StreamData } from "@/components/StreamCardLive";
import { useViewer } from "@/hooks/useViewer";

interface ExpandedStreamViewProps {
  stream: StreamData;
  duration: number;
  onClose: () => void;
}

export function ExpandedStreamView({ stream, duration, onClose }: ExpandedStreamViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "failed">("connecting");
  
  const {
    isReceiving,
    remoteStream,
    error,
    connect,
    disconnect,
  } = useViewer({
    streamId: stream.id,
    onStreamReady: () => setConnectionStatus("connected"),
    onStreamEnded: () => setConnectionStatus("failed"),
  });

  useEffect(() => {
    if (stream.id) {
      connect();
    }
    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream.id]);

  useEffect(() => {
    if (videoRef.current && remoteStream) {
      videoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4 bg-zinc-900">
          <div className="flex items-center gap-3">
            <Badge className="bg-red-600 text-white text-xs font-semibold px-2 py-1 gap-1.5 border-0">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
              </span>
              LIVE
            </Badge>
            <h2 className="text-xl font-bold text-white">Stream: {stream.id.substring(0, 12)}...</h2>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Main content */}
        <div className="flex-1 p-6 overflow-auto bg-zinc-950">
          <div className="grid gap-6 lg:grid-cols-3 h-full">
            {/* Video feed - takes up 2 columns */}
            <div className="lg:col-span-2">
              <Card className="overflow-hidden border-zinc-800 bg-zinc-900 h-full">
                <CardHeader className="border-b border-zinc-800 pb-3 bg-zinc-900">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Radio className="h-5 w-5 text-red-500" />
                      <CardTitle className="text-lg font-semibold text-white">
                        Live Feed
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-2 rounded-full bg-zinc-800 border border-zinc-700 px-3 py-1.5">
                      <Clock className="h-4 w-4 text-zinc-400" />
                      <span className="font-mono text-sm font-bold text-white">
                        {formatDuration(duration)}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0 h-[calc(100%-60px)]">
                  <div className="relative h-full min-h-[400px] bg-black">
                    {/* Real Video Feed via WebRTC */}
                    {remoteStream ? (
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      /* Placeholder / Loading State */
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-600/10 border border-red-500/20">
                            <Radio className="h-8 w-8 text-red-500" />
                          </div>
                          <p className="text-sm text-zinc-300">
                            {error ? "Failed to connect" : "Connecting to live stream..."}
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            Stream ID: {stream.id.substring(0, 8)}...
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="absolute left-4 top-4 flex gap-2">
                      <Badge className="bg-red-600 text-white gap-1.5 px-3 py-1 border-0">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                        </span>
                        LIVE
                      </Badge>
                      {isReceiving ? (
                        <Badge className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 gap-1">
                          <Wifi className="h-3 w-3" />
                          Connected
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-600/20 text-amber-400 border border-amber-500/30 gap-1">
                          <WifiOff className="h-3 w-3" />
                          {error ? "Error" : "Connecting..."}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Metadata panel */}
            <div className="space-y-4">
              <Card className="border-zinc-800 bg-zinc-900">
                <CardHeader className="pb-3 bg-zinc-900">
                  <CardTitle className="flex items-center gap-2 text-base text-white">
                    <Radio className="h-4 w-4 text-red-500" />
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
                      <p className="text-sm text-zinc-300">{formatTimestamp(stream.startedAt)}</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Duration
                    </p>
                    <p className="font-mono text-lg font-bold text-red-500">
                      {formatDuration(duration)}
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
                  <div className="rounded-lg bg-zinc-800 border border-zinc-700 p-3">
                    <p className="font-mono text-sm text-zinc-300">
                      {stream.latitude.toFixed(6)}, {stream.longitude.toFixed(6)}
                    </p>
                  </div>
                  {(stream.latitude && stream.longitude) ? (
                    <a 
                      href={`https://www.google.com/maps?q=${stream.latitude},${stream.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <div className="aspect-square rounded-lg overflow-hidden border border-zinc-700 relative group">
                        <img
                          src={`https://static-maps.yandex.ru/1.x/?ll=${stream.longitude},${stream.latitude}&z=15&l=map&size=400,400&pt=${stream.longitude},${stream.latitude},pm2rdl`}
                          alt="Location map"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback to OpenStreetMap static if Yandex fails
                            (e.target as HTMLImageElement).src = `https://www.openstreetmap.org/export/embed.html?bbox=${stream.longitude - 0.005},${stream.latitude - 0.005},${stream.longitude + 0.005},${stream.latitude + 0.005}&layer=mapnik&marker=${stream.latitude},${stream.longitude}`;
                          }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                          <span className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                            Open in Google Maps
                          </span>
                        </div>
                      </div>
                    </a>
                  ) : (
                    <div className="aspect-square rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                      <div className="text-center">
                        <MapPin className="mx-auto h-8 w-8 text-zinc-600" />
                        <p className="mt-2 text-xs text-zinc-500">Acquiring location...</p>
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

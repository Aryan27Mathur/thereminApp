"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, Trash2, RefreshCw, Edit, X } from "lucide-react";

// Define the structure of a Recording
interface Recording {
  Key: string;         // File name
  LastModified: string; // Date the file was last modified
  Size: number;         // Size of the file in bytes
}

export default function ThereminRecordings() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<Recording | null>(null);
  const [newName, setNewName] = useState("");
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [presignedUrl, setPresignedUrl] = useState<string | null>(null); // State for presigned URL
  const audioRef = useRef<HTMLAudioElement>(null);

  // Fetch all recordings from the backend (GET request to /api/recordings)
  const loadRecordings = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/recordings");
      const data = await response.json();
      setRecordings(data.recordings || []);
    } catch (error) {
      console.error("Error fetching recordings:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadRecordings();
  }, []);

  // Delete a recording (POST request to /api/recordings with 'delete' action)
  const deleteRecording = async (id: string) => {
    try {
      const response = await fetch("/api/recordings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", oldFileName: id }),
      });
      const data = await response.json();
      if (data.success) {
        loadRecordings(); // Refresh the list after deletion
      }
    } catch (error) {
      console.error("Error deleting recording:", error);
    }
  };

  // Rename a recording (POST request to /api/recordings with 'rename' action)
  const renameRecording = async (id: string) => {
    if (!newName) return;

    try {
      const response = await fetch("/api/recordings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rename", oldFileName: id, newFileName: newName }),
      });
      const data = await response.json();
      if (data.success) {
        setNewName(""); // Reset the input field
        loadRecordings(); // Refresh the list after renaming
      }
    } catch (error) {
      console.error("Error renaming recording:", error);
    }
  };

  // Get a pre-signed URL to play a recording (POST request to /api/recordings with 'presigned-url' action)
  const playRecording = async (recording: Recording) => {
    try {
      // Send POST request to /api/recordings to get the presigned URL
      const response = await fetch("/api/recordings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "presigned-url",
          fileName: recording.Key,  // Pass the file name (Key) from the recording object
        }),
      });

      // Parse the response
      const data = await response.json();
      console.log("Presigned URL:", data.url);
      if (data.url) {
        // Set the presigned URL in state
        setPresignedUrl(data.url);  // Update the presigned URL
        setCurrentlyPlaying(recording);
        setIsPlayerOpen(true);
      } else {
        console.error("Failed to get presigned URL:", data.error);
      }
    } catch (error) {
      console.error("Error fetching presigned URL:", error);
    }
  };

  const stopPlaying = () => {
    setCurrentlyPlaying(null);
    setIsPlayerOpen(false);
    setPresignedUrl(null); // Reset the URL when stopping playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Theremin Recordings</h1>
      <ScrollArea className="h-[600px] w-full rounded-md border p-4">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <RefreshCw className="animate-spin h-8 w-8" />
          </div>
        ) : (
          recordings.map((recording) => (
            <Card key={recording.Key} className="mb-4">
              <CardHeader>
                <CardTitle>{recording.Key.replace(".wav", "")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">Last modified: {new Date(recording.LastModified).toLocaleDateString()}</p>
                <p className="text-sm text-gray-500">Size: {(recording.Size / 1024 / 1024).toFixed(2)} MB</p>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button onClick={() => playRecording(recording)} variant="default">
                  <Play className="mr-2 h-4 w-4" />
                  Play
                </Button>
                <div className="flex space-x-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Edit className="mr-2 h-4 w-4" />
                        Rename
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Rename Recording</DialogTitle>
                        <DialogDescription>
                          Enter a new name for the recording.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="name" className="text-right">
                            Name
                          </Label>
                          <Input
                            id="name"
                            defaultValue={recording.Key.replace(".wav", "")}
                            onChange={(e) => setNewName(e.target.value)}
                            className="col-span-3"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={() => renameRecording(recording.Key)}>Save changes</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the recording.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteRecording(recording.Key)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardFooter>
            </Card>
          ))
        )}
      </ScrollArea>
      <div className="mt-4 flex justify-center">
        <Button onClick={loadRecordings}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh Recordings
        </Button>
      </div>

      <Dialog open={isPlayerOpen} onOpenChange={setIsPlayerOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{currentlyPlaying?.Key.replace(".wav", "")}</DialogTitle>
            <DialogDescription>
              Last modified: {new Date(currentlyPlaying?.LastModified ?? "").toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <audio ref={audioRef} controls className="w-full">
              {/* Bind the presigned URL to the src */}
              <source src={presignedUrl ?? undefined} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
          </div>
          <DialogFooter>
            <Button onClick={stopPlaying} variant="secondary">
              <X className="mr-2 h-4 w-4" />
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

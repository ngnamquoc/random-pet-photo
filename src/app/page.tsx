"use client";
import React, { useState } from "react";
import { Select, SelectItem, Button, Card, CardHeader, CardBody, Spinner } from "@heroui/react";
import { RefreshCw } from "lucide-react";
import { FileUpload } from "@/components/file-upload";
import { ThemeToggle } from "@/components/theme-toggle";
import { ToastContainer, toast } from "@/components/toast";
import Image from "next/image";

const labels = ["cat", "dog"] as const;
type Label = (typeof labels)[number];

export default function Home() {
  const [label, setLabel] = useState<Label>("cat");
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  /* -------- Upload handler ---------- */
  const handleFileUpload = async (file: File) => {
    setUploading(true);
    
    try {
      const uploadUrl = `${process.env.NEXT_PUBLIC_API_BASE}/upload?label=${label}`;

      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (res.ok) {
        toast.success("🎉 Uploaded!");
      } else {
        const errorText = await res.text();
        throw new Error(errorText);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Upload failed";
      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  /* -------- Retrieval handler ---------- */
  async function fetchRandom() {
    setLoading(true);
    setImgUrl(null);
    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE}/random?label=${label}`;
      
      const res = await fetch(apiUrl);
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`API Error: ${res.status} - ${errorText}`);
      }
      
      const data = await res.json();
      
      if (data.url) {
        setImgUrl(data.url);
        toast.success(`Found a random ${label}!`);
      } else {
        throw new Error("No image URL received from API");
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch image";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <ToastContainer />
      <ThemeToggle />
      <main className="min-h-screen flex flex-col items-center justify-start px-4 py-10 bg-background gap-10">
        <h1 className="text-3xl font-bold text-foreground">Image Upload & Retrieval Demo</h1>

        {/* ---- Controls ---- */}
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto items-center">
          <Select
            selectedKeys={[label]}
            onSelectionChange={(keys) => {
              const selectedValue = Array.from(keys)[0] as Label;
              setLabel(selectedValue);
            }}
            className="w-[120px]"
            label="Pet Type"
          >
            {labels.map((l) => (
              <SelectItem key={l}>
                {l.toUpperCase()}
              </SelectItem>
            ))}
          </Select>

          <FileUpload
            onFileSelect={handleFileUpload}
            className={uploading ? "opacity-50 pointer-events-none" : ""}
          />

          <Button 
            color="primary" 
            onClick={fetchRandom}
            isLoading={loading}
            startContent={!loading && <RefreshCw className="h-4 w-4" />}
          >
            Random {label}
          </Button>
        </div>

        {/* ---- Preview ---- */}
        <Card className="w-full max-w-md">
          <CardHeader className="pb-2">
            <h3 className="text-lg font-semibold">Preview</h3>
          </CardHeader>
          <CardBody className="flex items-center justify-center min-h-[320px]">
            {loading ? (
              <Spinner size="lg" />
            ) : imgUrl ? (
              <Image
                src={imgUrl}
                alt="random pet"
                width={320}
                height={320}
                className="max-h-80 object-contain rounded-lg"
                unoptimized
                onError={() => {
                  toast.error('Failed to load image');
                }}
              />
            ) : (
              <p className="text-default-400">No image loaded</p>
            )}
          </CardBody>
        </Card>
      </main>
    </>
  );
}

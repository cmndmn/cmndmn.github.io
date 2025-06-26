import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export function FileUpload() {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      return fetch("/api/assets/import", {
        method: "POST",
        body: formData,
        credentials: "include",
      }).then(async (response) => {
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Upload failed");
        }
        return response.json();
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      toast({
        title: "Success",
        description: data.message,
      });
      if (data.errors && data.errors.length > 0) {
        console.warn("Import warnings:", data.errors);
      }
      setUploadProgress(0);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setUploadProgress(0);
    },
  });

  const handleFileSelect = (file: File) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Error",
        description: "Invalid file type. Only .xlsx and .xls files are allowed.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "File too large. Maximum size is 10MB.",
        variant: "destructive",
      });
      return;
    }

    setUploadProgress(0);
    uploadMutation.mutate(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
    // Reset input value so same file can be selected again
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      {/* File Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-200 ${
          isDragOver
            ? "border-primary bg-primary/5"
            : uploadMutation.isPending
            ? "border-slate-300 bg-slate-50"
            : "border-slate-300 hover:border-primary"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={!uploadMutation.isPending ? handleClick : undefined}
      >
        <Upload className="mx-auto h-12 w-12 text-slate-400 mb-4" />
        <p className="text-sm text-slate-600 mb-2">
          <span className="font-medium text-primary">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-slate-500">Supports .xlsx and .xls files up to 10MB</p>
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleFileInputChange}
          disabled={uploadMutation.isPending}
        />
      </div>

      {/* Upload Progress */}
      {uploadMutation.isPending && (
        <div className="bg-slate-100 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Processing file...</span>
          </div>
          <Progress value={50} className="w-full" />
        </div>
      )}

      {/* Sample Format Info */}
      <div className="p-4 bg-slate-50 rounded-lg">
        <h4 className="text-sm font-medium text-slate-900 mb-2">Expected Excel Format:</h4>
        <div className="grid grid-cols-3 gap-2 text-xs mb-2">
          <div className="bg-white p-2 rounded border text-center font-medium">Asset Name</div>
          <div className="bg-white p-2 rounded border text-center font-medium">Asset Type</div>
          <div className="bg-white p-2 rounded border text-center font-medium">Asset Tag</div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-white p-2 rounded border text-center font-medium">Serial Number</div>
          <div className="bg-white p-2 rounded border text-center font-medium">Cost</div>
          <div className="bg-white p-2 rounded border text-center font-medium">Acquisition Date</div>
        </div>
        <p className="text-xs text-slate-600 mt-2">Ensure your Excel file has these column headers in the first row. Serial Number and Acquisition Date are optional.</p>
      </div>
    </div>
  );
}

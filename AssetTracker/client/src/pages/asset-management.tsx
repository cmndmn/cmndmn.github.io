import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUpload } from "@/components/ui/file-upload";
import { DataTable } from "@/components/ui/data-table";
import { AssetModal } from "@/components/asset-modal";
import { Download, Plus, Search } from "lucide-react";
import type { Asset } from "@shared/schema";

export default function AssetManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const { toast } = useToast();

  const { data: assets = [], isLoading } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });

  const deleteAssetMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/assets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      toast({
        title: "Success",
        description: "Asset deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete asset",
        variant: "destructive",
      });
    },
  });

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.tag.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || asset.type === filterType;
    return matchesSearch && matchesType;
  });

  const totalValue = filteredAssets.reduce((sum, asset) => sum + parseFloat(asset.cost), 0);

  const handleAddAsset = () => {
    setEditingAsset(null);
    setShowModal(true);
  };

  const handleEditAsset = (asset: Asset) => {
    setEditingAsset(asset);
    setShowModal(true);
  };

  const handleDeleteAsset = (asset: Asset) => {
    if (confirm(`Are you sure you want to delete "${asset.name}"?`)) {
      deleteAssetMutation.mutate(asset.id);
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch("/api/assets/export", {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Export failed");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "assets.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Success",
        description: "Assets exported successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export assets",
        variant: "destructive",
      });
    }
  };

  const assetTypes = Array.from(new Set(assets.map(asset => asset.type)));

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                </div>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">AssetTracker Pro</h1>
                <p className="text-sm text-slate-500 hidden sm:block">Asset Management System</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-slate-600">JD</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="sm:flex sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Asset Management</h2>
              <p className="mt-1 text-sm text-slate-600">Import, manage, and track your organization's assets</p>
            </div>
            <div className="mt-4 sm:mt-0 sm:flex sm:space-x-3">
              <Button variant="outline" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </Button>
              <Button onClick={handleAddAsset}>
                <Plus className="w-4 h-4 mr-2" />
                Add Asset
              </Button>
            </div>
          </div>
        </div>

        {/* File Upload Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Import Assets from Excel</CardTitle>
          </CardHeader>
          <CardContent>
            <FileUpload />
          </CardContent>
        </Card>

        {/* Assets Table Section */}
        <Card>
          <CardHeader>
            <div className="sm:flex sm:items-center sm:justify-between">
              <div>
                <CardTitle>Assets Overview</CardTitle>
                <p className="text-sm text-slate-600 mt-1">
                  {filteredAssets.length} total assets worth ${totalValue.toFixed(2)}
                </p>
              </div>
              
              {/* Search and Filter Controls */}
              <div className="mt-4 sm:mt-0 sm:flex sm:space-x-3">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search assets..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-64 pl-10"
                  />
                </div>
                
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {assetTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable
              assets={filteredAssets}
              isLoading={isLoading}
              onEdit={handleEditAsset}
              onDelete={handleDeleteAsset}
            />
          </CardContent>
        </Card>
      </main>

      {/* Asset Modal */}
      <AssetModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        asset={editingAsset}
      />
    </div>
  );
}

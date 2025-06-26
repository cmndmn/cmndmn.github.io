import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import * as XLSX from "xlsx";
import { storage } from "./storage";
import { insertAssetSchema, type InsertAsset } from "@shared/schema";
import { z } from "zod";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only .xlsx and .xls files are allowed.'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all assets
  app.get("/api/assets", async (req, res) => {
    try {
      const assets = await storage.getAllAssets();
      res.json(assets);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch assets" });
    }
  });

  // Get single asset
  app.get("/api/assets/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid asset ID" });
      }

      const asset = await storage.getAsset(id);
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }

      res.json(asset);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch asset" });
    }
  });

  // Create new asset
  app.post("/api/assets", async (req, res) => {
    try {
      const validatedData = insertAssetSchema.parse(req.body);
      
      // Check if tag already exists
      const existingAsset = await storage.getAssetByTag(validatedData.tag);
      if (existingAsset) {
        return res.status(409).json({ message: "Asset tag already exists" });
      }

      const asset = await storage.createAsset(validatedData);
      res.status(201).json(asset);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create asset" });
    }
  });

  // Update asset
  app.put("/api/assets/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid asset ID" });
      }

      const validatedData = insertAssetSchema.partial().parse(req.body);
      
      // Check if tag already exists (if tag is being updated)
      if (validatedData.tag) {
        const existingAsset = await storage.getAssetByTag(validatedData.tag);
        if (existingAsset && existingAsset.id !== id) {
          return res.status(409).json({ message: "Asset tag already exists" });
        }
      }

      const asset = await storage.updateAsset(id, validatedData);
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }

      res.json(asset);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to update asset" });
    }
  });

  // Delete asset
  app.delete("/api/assets/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid asset ID" });
      }

      const deleted = await storage.deleteAsset(id);
      if (!deleted) {
        return res.status(404).json({ message: "Asset not found" });
      }

      res.json({ message: "Asset deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete asset" });
    }
  });

  // Import assets from Excel
  app.post("/api/assets/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Parse Excel file
      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      if (data.length === 0) {
        return res.status(400).json({ message: "Excel file is empty" });
      }

      // Validate and transform data
      const assetsToCreate: InsertAsset[] = [];
      const errors: string[] = [];

      for (let i = 0; i < data.length; i++) {
        const row = data[i] as any;
        const rowNumber = i + 2; // Account for header row

        try {
          // Map Excel columns to our schema (flexible column names)
          const name = row["Asset Name"] || row["Name"] || row["asset_name"] || row["name"];
          const type = row["Asset Type"] || row["Type"] || row["asset_type"] || row["type"];
          const tag = row["Asset Tag"] || row["Tag"] || row["asset_tag"] || row["tag"];
          const cost = row["Cost"] || row["cost"] || row["Price"] || row["price"];
          const serialNumber = row["Serial Number"] || row["SerialNumber"] || row["serial_number"] || row["serial"];
          const acquisitionDate = row["Acquisition Date"] || row["AcquisitionDate"] || row["acquisition_date"] || row["date"];

          if (!name || !type || !tag || cost === undefined) {
            errors.push(`Row ${rowNumber}: Missing required fields (Name, Type, Tag, Cost)`);
            continue;
          }

          // Check if tag already exists
          const existingAsset = await storage.getAssetByTag(String(tag));
          if (existingAsset) {
            errors.push(`Row ${rowNumber}: Asset tag '${tag}' already exists`);
            continue;
          }

          const assetData = {
            name: String(name),
            type: String(type),
            tag: String(tag),
            cost: String(cost),
            serialNumber: serialNumber ? String(serialNumber) : undefined,
            acquisitionDate: acquisitionDate ? String(acquisitionDate) : undefined,
          };

          const validatedAsset = insertAssetSchema.parse(assetData);
          assetsToCreate.push(validatedAsset);
        } catch (error) {
          if (error instanceof z.ZodError) {
            errors.push(`Row ${rowNumber}: ${error.errors.map(e => e.message).join(", ")}`);
          } else {
            errors.push(`Row ${rowNumber}: Invalid data format`);
          }
        }
      }

      if (errors.length > 0 && assetsToCreate.length === 0) {
        return res.status(400).json({ 
          message: "No valid assets found in file", 
          errors 
        });
      }

      // Create assets
      const createdAssets = await storage.createManyAssets(assetsToCreate);

      res.json({
        message: `Successfully imported ${createdAssets.length} assets`,
        imported: createdAssets.length,
        errors: errors.length > 0 ? errors : undefined,
        assets: createdAssets,
      });
    } catch (error) {
      console.error("Import error:", error);
      res.status(500).json({ message: "Failed to import assets from Excel file" });
    }
  });

  // Export assets to Excel
  app.get("/api/assets/export", async (req, res) => {
    try {
      const assets = await storage.getAllAssets();
      
      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(assets.map(asset => ({
        "Asset Name": asset.name,
        "Asset Type": asset.type,
        "Asset Tag": asset.tag,
        "Serial Number": asset.serialNumber || "",
        "Cost": asset.cost,
        "Acquisition Date": asset.acquisitionDate || "",
      })));
      
      XLSX.utils.book_append_sheet(workbook, worksheet, "Assets");
      
      // Generate buffer
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      
      res.setHeader("Content-Disposition", "attachment; filename=assets.xlsx");
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.send(buffer);
    } catch (error) {
      res.status(500).json({ message: "Failed to export assets" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

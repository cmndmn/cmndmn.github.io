# Asset Management System

## Overview

This is a full-stack asset management application built with React, TypeScript, Express.js, and PostgreSQL. The system allows users to manage company assets through a modern web interface with features for creating, reading, updating, and deleting asset records. The application also supports Excel file imports for bulk asset management.

## System Architecture

The application follows a monorepo structure with clear separation between client-side and server-side code:

- **Frontend**: React with TypeScript, using Vite as the build tool
- **Backend**: Express.js with TypeScript for RESTful API
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design system
- **State Management**: TanStack Query for server state management

## Key Components

### Frontend Architecture
- **Component Library**: shadcn/ui components provide a consistent design system
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation
- **Data Fetching**: TanStack Query for efficient server state management
- **File Handling**: Custom file upload component with Excel parsing support

### Backend Architecture
- **API Design**: RESTful endpoints following standard HTTP conventions
- **Database Layer**: Drizzle ORM with PostgreSQL dialect
- **File Processing**: Multer middleware for file uploads with Excel parsing via XLSX library
- **Storage Strategy**: PostgreSQL database with Drizzle ORM for persistent data storage
- **Error Handling**: Centralized error handling with proper HTTP status codes

### Database Schema
The application uses a simple but effective schema:
- **Assets Table**: Core entity with id, name, type, tag (unique), and cost fields
- **Users Table**: Basic user management with username and password fields
- **Type Safety**: Drizzle-Zod integration ensures runtime validation matches database schema

## Data Flow

1. **Asset Management Flow**:
   - User interactions trigger React components
   - TanStack Query manages API calls and caching
   - Express.js API handles business logic
   - Drizzle ORM executes type-safe database operations
   - Results flow back through the same chain with automatic UI updates

2. **File Import Flow**:
   - User uploads Excel file through drag-and-drop interface
   - Multer processes the file with type validation
   - XLSX library parses spreadsheet data
   - Batch database operations create multiple asset records
   - Real-time feedback shows import progress and results

## External Dependencies

### Core Framework Dependencies
- **React Ecosystem**: React 18+ with TypeScript support
- **Build Tools**: Vite for development and production builds
- **Database**: PostgreSQL 16 with Neon serverless driver
- **ORM**: Drizzle ORM with migrations support

### UI and Styling
- **Component Library**: Radix UI primitives for accessibility
- **Styling**: Tailwind CSS with custom theme configuration
- **Icons**: Lucide React for consistent iconography

### Development Tools
- **TypeScript**: Full type safety across the stack
- **ESBuild**: Fast production builds for server code
- **TSX**: TypeScript execution for development

## Deployment Strategy

The application is configured for Replit deployment with:

- **Development Mode**: `npm run dev` starts both client and server with hot reloading
- **Production Build**: `npm run build` creates optimized bundles for both frontend and backend
- **Production Start**: `npm run start` runs the compiled server code
- **Port Configuration**: Server runs on port 5000 with proper external port mapping
- **Database**: Expects DATABASE_URL environment variable for PostgreSQL connection

### Build Process
1. Frontend builds to `dist/public` directory
2. Backend compiles to `dist` directory with external dependencies
3. Production server serves static files and API endpoints
4. Database migrations run via `npm run db:push`

## Recent Changes

- June 26, 2025: Migrated from in-memory storage to PostgreSQL database
- June 26, 2025: Implemented DatabaseStorage class using Drizzle ORM
- June 26, 2025: Successfully pushed database schema and created tables
- June 25, 2025: Added acquisition date and serial number fields to asset schema
- June 25, 2025: Updated frontend forms and data table to support new fields
- June 25, 2025: Enhanced Excel import/export to handle serial numbers and acquisition dates
- June 25, 2025: Initial asset management system setup

## User Preferences

Preferred communication style: Simple, everyday language.
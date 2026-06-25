-- ================================================================
-- Design Editor Schema Migration
-- Migration: 001_create_design_editor_schema
-- Created: 2025-06-28
-- Description: Creates all tables, types, indexes, RLS policies, and functions for the design editor
-- ================================================================

-- First, check if uuid-ossp extension exists (required for uuid_generate_v4())
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- CREATE CUSTOM TYPES
-- ================================================================

-- Create design-related enums (only if they don't exist)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'design_status') THEN
        CREATE TYPE design_status AS ENUM ('draft', 'published', 'archived', 'shared');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'asset_type') THEN
        CREATE TYPE asset_type AS ENUM ('image', 'video', 'audio', 'document', 'design_template');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'share_permission') THEN
        CREATE TYPE share_permission AS ENUM ('view', 'edit', 'comment');
    END IF;
END $$;

-- ================================================================
-- CREATE TABLES
-- ================================================================

-- Create prerequisite tables if they don't exist
-- Users table (basic auth users table)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workspaces table (for multi-tenancy)
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workspace members table (for workspace access control)
CREATE TABLE IF NOT EXISTS workspace_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member', -- member, editor, manager, owner
    invited_by UUID REFERENCES users(id),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);

-- Design projects table (main table for storing design data)
CREATE TABLE IF NOT EXISTS design_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Untitled Design',
    description TEXT,
    thumbnail_url TEXT,
    canvas_data JSONB NOT NULL DEFAULT '{}', -- Stores FabricJS canvas JSON
    frame JSONB DEFAULT '{"width": 800, "height": 600}', -- Canvas dimensions
    status design_status DEFAULT 'draft',
    is_template BOOLEAN DEFAULT FALSE,
    template_category TEXT,
    tags TEXT[],
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    last_modified_by UUID REFERENCES users(id),
    last_saved_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Design shares table (for sharing designs with others)
CREATE TABLE IF NOT EXISTS design_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    design_project_id UUID NOT NULL REFERENCES design_projects(id) ON DELETE CASCADE,
    shared_with_email TEXT,
    shared_with_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    permission share_permission DEFAULT 'view',
    expires_at TIMESTAMPTZ,
    share_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT check_shared_with CHECK (
        (shared_with_email IS NOT NULL AND shared_with_user_id IS NULL) OR
        (shared_with_email IS NULL AND shared_with_user_id IS NOT NULL)
    )
);

-- Design comments table (for collaboration and feedback)
CREATE TABLE IF NOT EXISTS design_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    design_project_id UUID NOT NULL REFERENCES design_projects(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES design_comments(id) ON DELETE CASCADE, -- For replies
    content TEXT NOT NULL,
    position JSONB, -- Position on canvas where comment was made
    is_resolved BOOLEAN DEFAULT FALSE,
    created_by UUID NOT NULL REFERENCES users(id),
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Design collections table (for organizing designs into folders)
CREATE TABLE IF NOT EXISTS design_collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#6366f1', -- Collection color
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Design collection items table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS design_collection_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collection_id UUID NOT NULL REFERENCES design_collections(id) ON DELETE CASCADE,
    design_project_id UUID NOT NULL REFERENCES design_projects(id) ON DELETE CASCADE,
    added_by UUID NOT NULL REFERENCES users(id),
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(collection_id, design_project_id)
);

-- Design assets table (for file uploads and storage)
CREATE TABLE IF NOT EXISTS design_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT,
    mime_type TEXT,
    asset_type asset_type DEFAULT 'image',
    storage_path TEXT NOT NULL, -- Supabase storage path
    public_url TEXT,
    thumbnail_url TEXT,
    metadata JSONB DEFAULT '{}',
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Design templates table (public templates and user templates)
CREATE TABLE IF NOT EXISTS design_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE, -- NULL for public templates
    name TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT NOT NULL,
    canvas_data JSONB NOT NULL, -- FabricJS canvas JSON
    frame JSONB DEFAULT '{"width": 800, "height": 600}',
    category TEXT,
    tags TEXT[],
    is_public BOOLEAN DEFAULT FALSE,
    is_premium BOOLEAN DEFAULT FALSE,
    usage_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- CREATE INDEXES FOR BETTER PERFORMANCE
-- ================================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Workspaces indexes
CREATE INDEX IF NOT EXISTS idx_workspaces_created_by ON workspaces(created_by);
CREATE INDEX IF NOT EXISTS idx_workspaces_created_at ON workspaces(created_at);

-- Workspace members indexes
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_role ON workspace_members(role);

-- Design projects indexes
CREATE INDEX IF NOT EXISTS idx_design_projects_workspace_id ON design_projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_design_projects_created_by ON design_projects(created_by);
CREATE INDEX IF NOT EXISTS idx_design_projects_status ON design_projects(status);
CREATE INDEX IF NOT EXISTS idx_design_projects_is_template ON design_projects(is_template);
CREATE INDEX IF NOT EXISTS idx_design_projects_updated_at ON design_projects(updated_at);

-- Design shares indexes
CREATE INDEX IF NOT EXISTS idx_design_shares_project_id ON design_shares(design_project_id);
CREATE INDEX IF NOT EXISTS idx_design_shares_token ON design_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_design_shares_email ON design_shares(shared_with_email);

-- Design comments indexes
CREATE INDEX IF NOT EXISTS idx_design_comments_project_id ON design_comments(design_project_id);
CREATE INDEX IF NOT EXISTS idx_design_comments_parent_id ON design_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_design_comments_created_by ON design_comments(created_by);

-- Design collections indexes
CREATE INDEX IF NOT EXISTS idx_design_collections_workspace_id ON design_collections(workspace_id);
CREATE INDEX IF NOT EXISTS idx_design_collections_created_by ON design_collections(created_by);

-- Design collection items indexes
CREATE INDEX IF NOT EXISTS idx_design_collection_items_collection_id ON design_collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_design_collection_items_design_id ON design_collection_items(design_project_id);

-- Design assets indexes
CREATE INDEX IF NOT EXISTS idx_design_assets_workspace_id ON design_assets(workspace_id);
CREATE INDEX IF NOT EXISTS idx_design_assets_asset_type ON design_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_design_assets_uploaded_by ON design_assets(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_design_assets_created_at ON design_assets(created_at);

-- Design templates indexes
CREATE INDEX IF NOT EXISTS idx_design_templates_workspace_id ON design_templates(workspace_id);
CREATE INDEX IF NOT EXISTS idx_design_templates_is_public ON design_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_design_templates_category ON design_templates(category);
CREATE INDEX IF NOT EXISTS idx_design_templates_usage_count ON design_templates(usage_count);
CREATE INDEX IF NOT EXISTS idx_design_templates_created_by ON design_templates(created_by);

-- ================================================================
-- CREATE HELPER FUNCTIONS
-- ================================================================

-- Function to update updated_at timestamp (if it doesn't exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-update last_saved_at when canvas_data changes
CREATE OR REPLACE FUNCTION update_design_last_saved()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.canvas_data IS DISTINCT FROM NEW.canvas_data THEN
        NEW.last_saved_at = NOW();
        NEW.last_modified_by = auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create design project from template
CREATE OR REPLACE FUNCTION create_design_from_template(
    template_id UUID,
    project_name TEXT,
    target_workspace_id UUID
)
RETURNS TABLE (
    success BOOLEAN,
    design_id UUID,
    error_message TEXT
) AS $$
DECLARE
    template_record RECORD;
    new_design_id UUID;
BEGIN
    -- Get template data
    SELECT * INTO template_record 
    FROM design_templates 
    WHERE id = template_id AND (is_public = true OR workspace_id = target_workspace_id);

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::UUID, 'Template not found or access denied';
        RETURN;
    END IF;

    -- Create new design project
    INSERT INTO design_projects (
        workspace_id,
        name,
        description,
        canvas_data,
        frame,
        thumbnail_url,
        created_by,
        last_modified_by
    ) VALUES (
        target_workspace_id,
        project_name,
        template_record.description,
        template_record.canvas_data,
        template_record.frame,
        template_record.thumbnail_url,
        auth.uid(),
        auth.uid()
    ) RETURNING id INTO new_design_id;

    -- Increment template usage count
    UPDATE design_templates 
    SET usage_count = usage_count + 1 
    WHERE id = template_id;

    RETURN QUERY SELECT true, new_design_id, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper functions for workspace access (if they don't exist)
CREATE OR REPLACE FUNCTION is_workspace_member(workspace_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- This function should check if the current user is a member of the workspace
    -- You may need to adjust this based on your workspace membership table structure
    RETURN EXISTS (
        SELECT 1 FROM workspace_members 
        WHERE workspace_id = workspace_uuid 
        AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION has_workspace_role(workspace_uuid UUID, required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- This function should check if the current user has the required role in the workspace
    -- You may need to adjust this based on your workspace membership table structure
    RETURN EXISTS (
        SELECT 1 FROM workspace_members 
        WHERE workspace_id = workspace_uuid 
        AND user_id = auth.uid()
        AND role = required_role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- CREATE TRIGGERS
-- ================================================================

-- Apply updated_at trigger to all tables with updated_at column
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workspaces_updated_at ON workspaces;
CREATE TRIGGER update_workspaces_updated_at 
    BEFORE UPDATE ON workspaces 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_design_projects_updated_at ON design_projects;
CREATE TRIGGER update_design_projects_updated_at 
    BEFORE UPDATE ON design_projects 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_design_comments_updated_at ON design_comments;
CREATE TRIGGER update_design_comments_updated_at 
    BEFORE UPDATE ON design_comments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_design_collections_updated_at ON design_collections;
CREATE TRIGGER update_design_collections_updated_at 
    BEFORE UPDATE ON design_collections 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_design_assets_updated_at ON design_assets;
CREATE TRIGGER update_design_assets_updated_at 
    BEFORE UPDATE ON design_assets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_design_templates_updated_at ON design_templates;
CREATE TRIGGER update_design_templates_updated_at 
    BEFORE UPDATE ON design_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Special trigger for design projects to track when canvas data changes
DROP TRIGGER IF EXISTS update_design_last_saved_trigger ON design_projects;
CREATE TRIGGER update_design_last_saved_trigger 
    BEFORE UPDATE ON design_projects 
    FOR EACH ROW EXECUTE FUNCTION update_design_last_saved();

-- ================================================================
-- ENABLE ROW LEVEL SECURITY
-- ================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_templates ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- CREATE RLS POLICIES
-- ================================================================

-- Users policies
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
CREATE POLICY "Users can view their own profile" ON users 
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON users;
CREATE POLICY "Users can update their own profile" ON users 
    FOR UPDATE USING (auth.uid() = id);

-- Workspaces policies
DROP POLICY IF EXISTS "Workspace members can view workspace" ON workspaces;
CREATE POLICY "Workspace members can view workspace" ON workspaces 
    FOR SELECT USING (is_workspace_member(id));

DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;
CREATE POLICY "Users can create workspaces" ON workspaces 
    FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Workspace owners can update workspace" ON workspaces;
CREATE POLICY "Workspace owners can update workspace" ON workspaces 
    FOR UPDATE USING (has_workspace_role(id, 'owner'));

-- Workspace members policies
DROP POLICY IF EXISTS "Members can view workspace membership" ON workspace_members;
CREATE POLICY "Members can view workspace membership" ON workspace_members 
    FOR SELECT USING (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Workspace managers can add members" ON workspace_members;
CREATE POLICY "Workspace managers can add members" ON workspace_members 
    FOR INSERT WITH CHECK (has_workspace_role(workspace_id, 'manager'));

DROP POLICY IF EXISTS "Workspace managers can update member roles" ON workspace_members;
CREATE POLICY "Workspace managers can update member roles" ON workspace_members 
    FOR UPDATE USING (has_workspace_role(workspace_id, 'manager'));

-- Design projects policies
DROP POLICY IF EXISTS "Workspace members can view design projects" ON design_projects;
CREATE POLICY "Workspace members can view design projects" ON design_projects 
    FOR SELECT USING (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Workspace editors can create design projects" ON design_projects;
CREATE POLICY "Workspace editors can create design projects" ON design_projects 
    FOR INSERT WITH CHECK (is_workspace_member(workspace_id) AND has_workspace_role(workspace_id, 'editor'));

DROP POLICY IF EXISTS "Design creators and editors can update projects" ON design_projects;
CREATE POLICY "Design creators and editors can update projects" ON design_projects 
    FOR UPDATE USING (
        is_workspace_member(workspace_id) AND (
            created_by = auth.uid() OR 
            has_workspace_role(workspace_id, 'editor')
        )
    );

DROP POLICY IF EXISTS "Design creators and managers can delete projects" ON design_projects;
CREATE POLICY "Design creators and managers can delete projects" ON design_projects 
    FOR DELETE USING (
        is_workspace_member(workspace_id) AND (
            created_by = auth.uid() OR 
            has_workspace_role(workspace_id, 'manager')
        )
    );

-- Design shares policies
DROP POLICY IF EXISTS "Users can view shares they created or received" ON design_shares;
CREATE POLICY "Users can view shares they created or received" ON design_shares 
    FOR SELECT USING (
        created_by = auth.uid() OR 
        shared_with_user_id = auth.uid() OR
        shared_with_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Design project members can create shares" ON design_shares;
CREATE POLICY "Design project members can create shares" ON design_shares 
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM design_projects 
            WHERE design_projects.id = design_shares.design_project_id 
            AND (
                is_workspace_member(design_projects.workspace_id) OR
                design_projects.created_by = auth.uid()
            )
        )
    );

-- Design comments policies
DROP POLICY IF EXISTS "Project collaborators can view comments" ON design_comments;
CREATE POLICY "Project collaborators can view comments" ON design_comments 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM design_projects 
            WHERE design_projects.id = design_comments.design_project_id 
            AND (
                is_workspace_member(design_projects.workspace_id) OR
                EXISTS (
                    SELECT 1 FROM design_shares 
                    WHERE design_shares.design_project_id = design_projects.id 
                    AND (
                        design_shares.shared_with_user_id = auth.uid() OR
                        design_shares.shared_with_email = (SELECT email FROM auth.users WHERE id = auth.uid())
                    )
                )
            )
        )
    );

DROP POLICY IF EXISTS "Project collaborators can create comments" ON design_comments;
CREATE POLICY "Project collaborators can create comments" ON design_comments 
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM design_projects 
            WHERE design_projects.id = design_comments.design_project_id 
            AND is_workspace_member(design_projects.workspace_id)
        )
    );

-- Design collections policies
DROP POLICY IF EXISTS "Workspace members can view collections" ON design_collections;
CREATE POLICY "Workspace members can view collections" ON design_collections 
    FOR SELECT USING (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Workspace members can create collections" ON design_collections;
CREATE POLICY "Workspace members can create collections" ON design_collections 
    FOR INSERT WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Collection creators can update collections" ON design_collections;
CREATE POLICY "Collection creators can update collections" ON design_collections 
    FOR UPDATE USING (
        is_workspace_member(workspace_id) AND created_by = auth.uid()
    );

-- Design assets policies
DROP POLICY IF EXISTS "Workspace members can view design assets" ON design_assets;
CREATE POLICY "Workspace members can view design assets" ON design_assets 
    FOR SELECT USING (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Workspace members can upload assets" ON design_assets;
CREATE POLICY "Workspace members can upload assets" ON design_assets 
    FOR INSERT WITH CHECK (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Asset uploaders and managers can delete assets" ON design_assets;
CREATE POLICY "Asset uploaders and managers can delete assets" ON design_assets 
    FOR DELETE USING (
        is_workspace_member(workspace_id) AND (
            uploaded_by = auth.uid() OR 
            has_workspace_role(workspace_id, 'manager')
        )
    );

-- Design templates policies
DROP POLICY IF EXISTS "Anyone can view public templates" ON design_templates;
CREATE POLICY "Anyone can view public templates" ON design_templates 
    FOR SELECT USING (is_public = true);

DROP POLICY IF EXISTS "Workspace members can view workspace templates" ON design_templates;
CREATE POLICY "Workspace members can view workspace templates" ON design_templates 
    FOR SELECT USING (
        workspace_id IS NULL OR is_workspace_member(workspace_id)
    );

DROP POLICY IF EXISTS "Workspace editors can create templates" ON design_templates;
CREATE POLICY "Workspace editors can create templates" ON design_templates 
    FOR INSERT WITH CHECK (
        workspace_id IS NULL OR (is_workspace_member(workspace_id) AND has_workspace_role(workspace_id, 'editor'))
    );

DROP POLICY IF EXISTS "Template creators and managers can update templates" ON design_templates;
CREATE POLICY "Template creators and managers can update templates" ON design_templates 
    FOR UPDATE USING (
        
        workspace_id IS NULL OR (
            is_workspace_member(workspace_id) AND (
                created_by = auth.uid() OR 
                has_workspace_role(workspace_id, 'manager')
            )
        )
    );

-- ================================================================
-- MIGRATION COMPLETE
-- ================================================================

-- Insert a record to track this migration (optional)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schema_migrations') THEN
        CREATE TABLE schema_migrations (
            version TEXT PRIMARY KEY,
            applied_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
    
    INSERT INTO schema_migrations (version) VALUES ('001_create_design_editor_schema')
    ON CONFLICT (version) DO NOTHING;
END $$;

-- Success message
SELECT 'Design editor schema migration completed successfully!' as status;

-- ========================================================
-- Supabase SQL Schema for Stock Aiming & Daily Tasks
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ========================================================

-- 1. Create stock_tasks table
CREATE TABLE IF NOT EXISTS public.stock_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    stock_item_id BIGINT REFERENCES public.items(id) ON DELETE SET NULL,
    stock_item_name TEXT NOT NULL,
    current_stock NUMERIC DEFAULT 0,
    target_aim NUMERIC NOT NULL DEFAULT 50,
    due_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_time TEXT DEFAULT '09:00',
    type TEXT DEFAULT 'restock', -- 'restock', 'aim', 'supplier', 'check'
    priority TEXT DEFAULT 'high', -- 'high', 'medium', 'low'
    status TEXT DEFAULT 'pending', -- 'pending', 'completed'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.stock_tasks ENABLE ROW LEVEL SECURITY;

-- 3. Create full-access policies for anon/authenticated users
DROP POLICY IF EXISTS "Allow select stock_tasks" ON public.stock_tasks;
CREATE POLICY "Allow select stock_tasks"
    ON public.stock_tasks FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow insert stock_tasks" ON public.stock_tasks;
CREATE POLICY "Allow insert stock_tasks"
    ON public.stock_tasks FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update stock_tasks" ON public.stock_tasks;
CREATE POLICY "Allow update stock_tasks"
    ON public.stock_tasks FOR UPDATE
    USING (true);

DROP POLICY IF EXISTS "Allow delete stock_tasks" ON public.stock_tasks;
CREATE POLICY "Allow delete stock_tasks"
    ON public.stock_tasks FOR DELETE
    USING (true);

-- 4. (Optional) Also add target_aim column directly to items table
ALTER TABLE public.items 
    ADD COLUMN IF NOT EXISTS target_aim NUMERIC DEFAULT 50;

-- 5. Realtime replication (optional, for instant multi-device sync)
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_tasks;

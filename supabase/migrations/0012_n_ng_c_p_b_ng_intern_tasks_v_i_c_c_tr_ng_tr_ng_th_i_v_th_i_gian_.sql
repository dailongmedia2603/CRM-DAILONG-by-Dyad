ALTER TABLE intern_tasks
ADD COLUMN status TEXT DEFAULT 'Chưa làm',
ADD COLUMN started_at TIMESTAMPTZ,
ADD COLUMN completed_at TIMESTAMPTZ;
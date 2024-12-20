-- Add sermon_id as UUID to group chunks together
ALTER TABLE documents
ADD COLUMN sermon_id uuid;

-- Add function to delete all chunks of a sermon
CREATE OR REPLACE FUNCTION delete_sermon(p_sermon_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM documents
  WHERE sermon_id = p_sermon_id
  AND user_id = p_user_id;
  
  RETURN FOUND;
END;
$$;
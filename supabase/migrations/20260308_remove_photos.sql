-- RPC function: spot owner can remove a photo URL from images array
CREATE OR REPLACE FUNCTION remove_spot_photo(spot_id uuid, photo_url text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE spots
  SET images = array_remove(images, photo_url)
  WHERE id = spot_id
    AND user_id = auth.uid();
END;
$$;

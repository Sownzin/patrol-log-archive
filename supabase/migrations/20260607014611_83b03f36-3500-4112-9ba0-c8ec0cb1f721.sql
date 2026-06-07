CREATE POLICY "Auth view banners"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'banners');

CREATE POLICY "Users upload own banner"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'banners' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users update own banner"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'banners' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete own banner"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'banners' AND (storage.foldername(name))[1] = auth.uid()::text);
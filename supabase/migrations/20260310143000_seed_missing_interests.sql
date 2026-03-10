-- Restore default onboarding interests without deleting any existing data.

INSERT INTO public.interests (name, icon) VALUES
  ('Wellness & Mental Health', 'heart'),
  ('Career & Professional Development', 'briefcase'),
  ('Workshops & Skill Building', 'brain'),
  ('Social & Community Events', 'megaphone'),
  ('Arts & Creative Activities', 'palette'),
  ('Academic Support & Research', 'graduation-cap'),
  ('International Student Services', 'cog'),
  ('Leadership & Personal Growth', 'rocket')
ON CONFLICT (name) DO UPDATE
SET icon = EXCLUDED.icon;

/*
  # Update Interest Categories for McGill Events

  1. Changes
    - Clear existing interests that don't match McGill event types
    - Add new interest categories that align with actual McGill events:
      - Wellness & Mental Health (yoga, therapy, support groups, wellness activities)
      - Career & Professional Development (career services, LinkedIn, job prep, negotiation)
      - Workshops & Skill Building (citation workshops, grad workshops, skill sessions)
      - Social & Community Events (networking, meetups, community activities)
      - Arts & Creative Activities (art hive, crochet, creative sessions)
      - Academic Support & Research (library sessions, PhD support, research)
      - International Student Services (immigration, ISS events, legal info)
      - Leadership & Personal Growth (leadership programs, emerging leaders)

  2. Notes
    - These categories better reflect the actual events available from McGill
    - Focused on student life, wellness, and development rather than purely technical events
*/

-- Clear existing interests
DELETE FROM user_preferences;
DELETE FROM interests;

-- Insert new McGill-aligned interests
INSERT INTO interests (name, icon) VALUES
  ('Wellness & Mental Health', 'heart'),
  ('Career & Professional Development', 'briefcase'),
  ('Workshops & Skill Building', 'brain'),
  ('Social & Community Events', 'megaphone'),
  ('Arts & Creative Activities', 'palette'),
  ('Academic Support & Research', 'graduation-cap'),
  ('International Student Services', 'cog'),
  ('Leadership & Personal Growth', 'rocket')
ON CONFLICT (name) DO NOTHING;
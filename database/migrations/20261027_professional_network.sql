-- Public community data is separate from private booking/contact records.
CREATE TABLE network_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  counselor_id text UNIQUE REFERENCES counselors(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  headline text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  skills text[] NOT NULL DEFAULT '{}',
  experience text NOT NULL DEFAULT '',
  education text NOT NULL DEFAULT '',
  website text NOT NULL DEFAULT '',
  image text NOT NULL DEFAULT '',
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz(3) NOT NULL DEFAULT now(),
  CHECK (user_id IS NOT NULL OR counselor_id IS NOT NULL)
);
CREATE INDEX network_profiles_public_idx ON network_profiles(published, name, id);

-- Mentors already consented to publication in their existing application flow.
INSERT INTO network_profiles(counselor_id,name,headline,bio,image,skills,published)
SELECT id,left(full_name,120),headline,bio,avatar_url,specialties,true FROM counselors;

CREATE FUNCTION network_new_mentor() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO network_profiles(counselor_id,name,headline,bio,image,skills,published)
  VALUES(NEW.id,left(NEW.full_name,120),NEW.headline,NEW.bio,NEW.avatar_url,NEW.specialties,true);
  RETURN NEW;
END;
$$;
CREATE TRIGGER network_new_mentor AFTER INSERT ON counselors FOR EACH ROW EXECUTE FUNCTION network_new_mentor();

CREATE TABLE network_follows (
  follower_id uuid NOT NULL REFERENCES network_profiles(id) ON DELETE CASCADE,
  followed_id uuid NOT NULL REFERENCES network_profiles(id) ON DELETE CASCADE,
  created_at timestamptz(3) NOT NULL DEFAULT now(),
  PRIMARY KEY(follower_id,followed_id), CHECK(follower_id<>followed_id)
);
CREATE INDEX network_follows_target_idx ON network_follows(followed_id);
CREATE TABLE network_blocks (
  blocker_id uuid NOT NULL REFERENCES network_profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES network_profiles(id) ON DELETE CASCADE,
  PRIMARY KEY(blocker_id,blocked_id), CHECK(blocker_id<>blocked_id)
);
CREATE TABLE network_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES network_profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK(char_length(body) BETWEEN 1 AND 3000),
  image text NOT NULL DEFAULT '',
  hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz(3) NOT NULL DEFAULT now(),
  edited_at timestamptz(3)
);
CREATE INDEX network_posts_feed_idx ON network_posts(created_at DESC,id DESC) WHERE NOT hidden;
CREATE INDEX network_posts_author_idx ON network_posts(author_id,created_at DESC,id DESC);
CREATE TABLE network_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES network_posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES network_profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK(char_length(body) BETWEEN 1 AND 1000),
  created_at timestamptz(3) NOT NULL DEFAULT now()
);
CREATE INDEX network_comments_post_idx ON network_comments(post_id,created_at,id);
CREATE TABLE network_likes (
  post_id uuid NOT NULL REFERENCES network_posts(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES network_profiles(id) ON DELETE CASCADE,
  PRIMARY KEY(post_id,profile_id)
);
CREATE TABLE network_saves (
  post_id uuid NOT NULL REFERENCES network_posts(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES network_profiles(id) ON DELETE CASCADE,
  PRIMARY KEY(post_id,profile_id)
);
CREATE TABLE network_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES network_profiles(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES network_profiles(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK(kind IN ('follow','comment')),
  post_id uuid REFERENCES network_posts(id) ON DELETE CASCADE,
  dedupe_key text UNIQUE NOT NULL,
  read_at timestamptz(3),
  created_at timestamptz(3) NOT NULL DEFAULT now()
);
CREATE INDEX network_notifications_recipient_idx ON network_notifications(recipient_id,created_at DESC);
CREATE TABLE network_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES network_posts(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES network_profiles(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK(reason IN ('spam','abuse','other')),
  resolved_at timestamptz(3),
  created_at timestamptz(3) NOT NULL DEFAULT now(),
  UNIQUE(post_id,reporter_id)
);
CREATE TABLE network_moderation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  hidden boolean NOT NULL,
  created_at timestamptz(3) NOT NULL DEFAULT now()
);

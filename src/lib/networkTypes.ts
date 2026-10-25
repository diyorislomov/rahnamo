export type NetworkProfile = {
  id: string;
  counselor_id: string | null;
  name: string;
  headline: string;
  bio: string;
  location: string;
  skills: string[];
  specialties?: string[];
  experience: string;
  education: string;
  website: string;
  image: string;
  published: boolean;
  followers: number;
  following: boolean;
  starting_price?: number | null;
  has_availability?: boolean;
};
export type NetworkPost = {
  id: string;
  body: string;
  image: string;
  created_at: string;
  edited_at: string | null;
  author: NetworkProfile;
  likes: number;
  comments: number;
  liked: boolean;
  saved: boolean;
};
export type NetworkComment = {
  id: string;
  body: string;
  created_at: string;
  author: NetworkProfile;
};
export type NetworkNotification = {
  id: string;
  kind: "follow" | "comment";
  post_id: string | null;
  read_at: string | null;
  created_at: string;
  actor: NetworkProfile;
};
export type NetworkMe = {
  profile: NetworkProfile | null;
  admin: boolean;
  canLinkMentor: boolean;
  unread: number;
};

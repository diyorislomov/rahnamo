export const networkUuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function networkText(
  value: unknown,
  max: number,
  min = 0,
): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length >= min && text.length <= max ? text : null;
}
export function networkImage(value: unknown): string | null {
  if (value === "") return "";
  if (typeof value !== "string" || value.length > 1000) return null;
  if (/^\/api\/uploads\/[a-f0-9-]{36}\.(png|jpg|webp)$/.test(value))
    return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      ["lh3.googleusercontent.com", "images.unsplash.com"].includes(
        url.hostname,
      )
      ? url.href
      : null;
  } catch {
    return null;
  }
}
export function networkProfileInput(value: Record<string, unknown>) {
  const name = networkText(value.name, 120, 2);
  const headline = networkText(value.headline, 160);
  const bio = networkText(value.bio, 2000);
  const location = networkText(value.location, 100);
  const experience = networkText(value.experience, 2000);
  const education = networkText(value.education, 1000);
  const image = networkImage(value.image);
  const website = networkText(value.website, 500);
  if (
    [
      name,
      headline,
      bio,
      location,
      experience,
      education,
      image,
      website,
    ].includes(null) ||
    typeof value.published !== "boolean"
  )
    return null;
  if (website) {
    try {
      const url = new URL(website);
      if (url.protocol !== "https:" || url.username || url.password)
        return null;
    } catch {
      return null;
    }
  }
  if (
    !Array.isArray(value.skills) ||
    value.skills.length > 12 ||
    value.skills.some((s) => networkText(s, 40, 1) === null)
  )
    return null;
  const skills = [...new Set(value.skills.map((s) => (s as string).trim()))];
  return {
    name: name!,
    headline: headline!,
    bio: bio!,
    location: location!,
    experience: experience!,
    education: education!,
    image: image!,
    website: website!,
    skills,
    published: value.published,
  };
}
export function networkCursor(
  raw: string | null,
): { time: string; id: string } | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(Buffer.from(raw, "base64url").toString());
    if (!networkUuid.test(value.id) || !Number.isFinite(Date.parse(value.time)))
      return null;
    return { time: new Date(value.time).toISOString(), id: value.id };
  } catch {
    return null;
  }
}

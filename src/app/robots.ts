import type { MetadataRoute } from "next";

// Private, invite-only app — keep it out of search engines entirely.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: "/" },
  };
}

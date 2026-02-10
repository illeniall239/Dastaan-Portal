/**
 * Pre-defined genre list for story categorization
 * Used in call reports and story submissions
 */

export const PREDEFINED_GENRES = [
  // Core TV Genres
  "Drama",
  "Comedy",
  "Action",
  "Thriller",
  "Horror",
  "Romance",
  "Sci-Fi",
  "Fantasy",
  "Mystery",

  // Documentary & Reality
  "Documentary",
  "Reality TV",
  "Docuseries",

  // Drama Sub-genres
  "Family Drama",
  "Medical Drama",
  "Legal Drama",
  "Crime Drama",
  "Historical Drama",
  "Period Drama",
  "Social Drama",
  "Political Drama",

  // Comedy Sub-genres
  "Sitcom",
  "Romantic Comedy",
  "Dark Comedy",
  "Satire",
  "Comedy Drama",

  // Thriller Sub-genres
  "Psychological Thriller",
  "Crime Thriller",
  "Political Thriller",

  // Additional Genres
  "Adventure",
  "Supernatural",
  "Biographical",
  "Musical",
  "Anthology",
  "War",
  "Western",

  // Pakistani/Regional Context
  "Social Issues",
  "Cultural",
  "Religious",
  "Spiritual Drama", // New
  "Women Centric Drama", // New
  "Class Conflict Drama", // New
  "Feudal", // New
  "Rural Drama", // New
  "Siblings Rivalry", // New
  "Inheritance Drama", // New
  "Tragedy", // New
  "Historical",

  // Catch-all
  "Other",
] as const;

/**
 * Type representing a single genre value
 */
export type Genre = typeof PREDEFINED_GENRES[number] | string;

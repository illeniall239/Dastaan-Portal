// Commercial Positioning and Gender POV: set on the project when it is logged (editable later).
// The project is the only source; the evaluation form no longer asks these.

export const COMMERCIAL_POSITIONING_OPTIONS = [
  { value: "commercial", label: "Commercial", description: "A drama made to attract a large audience, achieve high ratings, and generate strong commercial success through entertaining and emotionally engaging stories." },
  { value: "non_commercial", label: "Non Commercial/Experimental", description: "A drama that focuses on meaningful storytelling, realism, or social issues, where creative value is given more importance than ratings." },
  { value: "commercial_edge", label: "Commercial Edge", description: "A drama that combines mass appeal with a fresh concept or unique storytelling, aiming to achieve both strong ratings and quality." },
  { value: "signature_commercial", label: "Signature Commercial", description: "A premium, flagship drama that represents a channel's creative identity through outstanding storytelling, production quality, and lasting impact." },
] as const;

export const AUDIENCE_FOCUS_OPTIONS = [
  { value: "male_centric", label: "Male Centric" },
  { value: "female_centric", label: "Female Centric" },
  { value: "both", label: "Both" },
] as const;

export type CommercialPositioning = (typeof COMMERCIAL_POSITIONING_OPTIONS)[number]["value"];
export type AudienceFocus = (typeof AUDIENCE_FOCUS_OPTIONS)[number]["value"];

export const COMMERCIAL_POSITIONING_VALUES = COMMERCIAL_POSITIONING_OPTIONS.map((o) => o.value) as [CommercialPositioning, ...CommercialPositioning[]];
export const AUDIENCE_FOCUS_VALUES = AUDIENCE_FOCUS_OPTIONS.map((o) => o.value) as [AudienceFocus, ...AudienceFocus[]];

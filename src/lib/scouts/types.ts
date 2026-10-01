/** Shared types for scout agents. */

import type { Category } from "../skills";

export type ScoutSignal = {
  source: string;
  externalId: string;
  category?: Category;
  title: string;
  company?: string;
  description?: string;
  url: string;
  location?: string;
  budget?: string;
  deadline?: Date;
  contactEmail?: string;
  contactHandle?: string;
  tags?: string[];
  postedAt?: Date;
};

export type ScoutResult = {
  source: string;
  enabled: boolean;
  fetched: number;
  error?: string;
};

export type Scout = {
  name: string;
  /** Run the scout and return normalized signals. Errors must be caught inside. */
  run: () => Promise<ScoutSignal[]>;
};

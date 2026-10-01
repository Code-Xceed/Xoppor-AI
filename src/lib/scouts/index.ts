/** Scout registry — add new sources here. */

import type { Scout, ScoutResult, ScoutSignal } from "./types";
import { hackerNewsScout } from "./hackernews";
import { himalayasScout } from "./himalayas";
import { jobicyScout } from "./jobicy";
import { redditScout } from "./reddit";
import { remoteOkScout } from "./remoteok";
import { remotiveScout } from "./remotive";
import { weWorkRemotelyScout } from "./weworkremotely";
import { arbeitnowScout } from "./arbeitnow";
import { laraJobsScout } from "./larajobs";
import { noDeskScout } from "./nodesk";
import { cryptoJobsScout } from "./cryptojobs";
import { devpostScout } from "./devpost";
import { conferencesScout } from "./conferences";
import { bountiesScout } from "./bounties";
import { internshipsScout } from "./internships";

export const SCOUTS: Scout[] = [
  remoteOkScout,
  remotiveScout,
  hackerNewsScout,
  weWorkRemotelyScout,
  jobicyScout,
  himalayasScout,
  arbeitnowScout,
  laraJobsScout,
  noDeskScout,
  cryptoJobsScout,
  redditScout,
  devpostScout,
  conferencesScout,
  bountiesScout,
  internshipsScout,
];

export type { Scout, ScoutResult, ScoutSignal } from "./types";

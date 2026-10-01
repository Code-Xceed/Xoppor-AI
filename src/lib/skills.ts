/**
 * Your niche definition — the lens every opportunity is evaluated through.
 * Edit this file to retune the whole radar (scouts, scoring, alerts).
 */

/** Opportunity categories the radar hunts for. */
export type Category = "job" | "freelance" | "internship" | "hackathon" | "event" | "bounty";

export const categories: { id: Category; label: string; emoji: string }[] = [
  { id: "job", label: "Full-time / contract roles", emoji: "💼" },
  { id: "freelance", label: "Freelance gigs & contracts", emoji: "🧑‍💻" },
  { id: "internship", label: "Internships", emoji: "🎓" },
  { id: "hackathon", label: "Hackathons & challenges", emoji: "⚡" },
  { id: "event", label: "Conferences & events", emoji: "🎤" },
  { id: "bounty", label: "Bounties & paid open-source work", emoji: "🪙" },
];

/** Maps a skill area to keywords that indicate it in a post. */
export const skillKeywords: Record<string, string[]> = {
  fullstack: [
    "fullstack", "full-stack", "full stack", "web developer", "web development", "web app",
    "software engineer", "software developer", "frontend", "front-end", "backend", "back-end",
    "web engineer", "next.js", "nextjs", "react", "node", "typescript", "javascript", "python",
    "mern", "tailwind", "fastapi", "vue", "remix", "contract developer", "developer", "engineer",
    "golang", "rust", "django", "flask", "express", "sql", "postgres", "mongodb", "api",
  ],
  aiEngineering: [
    "ai engineer", "llm", "rag", "ai agents", "langchain", "openai", "gemini",
    "prompt engineer", "ai developer", "claude", "automation engineer", "ai integration",
    "artificial intelligence", "machine learning", "deep learning", "nlp", "computer vision",
    "agentic", "agent", "agents", "bot", "crawler", "scraping", "automation", "workflow",
    "machine learning/AI", "AI/ML",
  ],
  saasMvp: [
    "saas", "mvp", "startup", "proof of concept", "poc", "prototype",
    "founder", "funded", "seed", "platform", "marketplace", "founding engineer",
    "product engineer", "tech lead", "build an app", "app developer", "mobile app",
  ],
  freelanceContracts: [
    "freelance", "contract", "contractor", "gig", "bounty", "project-based",
    "hourly", "part-time", "consultant", "consulting", "freelancer", "short-term",
    "retainer", "fixed-price", "need help building",
  ],
  landing: [
    "landing page", "website redesign", "new website", "web site", "portfolio site",
    "wordpress", "squarespace", "wix", "shopify", "seo site", "responsive", "webflow", "framer",
  ],
  gui: [
    "dashboard", "admin panel", "ui", "interface", "design system",
    "web gui", "internal tool", "crm", "portal", "ui/ux",
  ],
  graphics: [
    "poster", "flyer", "banner", "logo", "brand", "graphic design", "thumbnail",
    "social media design", "illustration", "canva", "photoshop", "figma",
  ],
  video: [
    "video editing", "video editor", "reels", "shorts", "tiktok", "youtube",
    "premiere", "after effects", "davinci", "capcut", "motion graphics",
  ],
  windows: [
    "windows", "desktop app", "c#", ".net", "wpf", "electron", "desktop software",
    "automation script", "utility", "excel automation", "python script",
  ],
  data: [
    "data science", "data scientist", "data engineer", "quant", "quantitative",
    "analyst", "analytics", "pandas", "numpy", "tensorflow", "pytorch",
  ],
  hardware: [
    "hardware engineer", "embedded", "firmware", "fpga", "verilog", "pcb",
    "arduino", "raspberry pi", "iot",
  ],
};

/** Buying-signal keywords — urgency and intent markers. */
export const signalKeywords: {
  label: string;
  weight: number;
  words: string[];
}[] = [
  { label: "freelance / contract", weight: 30, words: ["freelance", "contract", "contractor", "gig", "bounty", "project-based", "consultant", "hourly", "part-time"] },
  { label: "actively hiring", weight: 25, words: ["hiring", "looking for", "need a", "seeking", "wanted", "who can", "help me build", "open position", "job opening", "intern", "internship", "new grad"] },
  { label: "budget / prize stated", weight: 20, words: ["budget", "$", "usd", "per hour", "fixed price", "salary", "paid", "/hr", "/yr", "compensation", "prize", "prize pool", "cash prize", "stipend"] },
  { label: "asap / urgent", weight: 15, words: ["asap", "urgent", "immediately", "right away", "this week", "deadline", "start now", "deadline approaching", "closing soon", "last chance", "days left"] },
  { label: "recently funded / startup", weight: 20, words: ["raised", "funding", "seed round", "series a", "backed by", "yc ", "y combinator", "accelerator", "early-stage"] },
  { label: "growing team", weight: 10, words: ["fast-growing", "scaling", "expanding", "growing team", "multiple roles"] },
  { label: "recurring work", weight: 15, words: ["ongoing", "long-term", "retainer", "recurring", "monthly", "partnership"] },
];

/** Things that lower an opportunity's score. */
export const redFlags: { label: string; weight: number; words: string[] }[] = [
  { label: "unpaid / exposure", weight: 60, words: ["unpaid", "for exposure", "revenue share only", "equity only", "no budget", "volunteer"] },
  { label: "must relocate / on-site only", weight: 30, words: ["must relocate", "on-site only", "no remote", "relocation required", "in-person only"] },
  { label: "too small", weight: 15, words: ["$20 budget", "$30 budget", "$50 budget", "quick fix only"] },
  { label: "expired", weight: 80, words: [] }, // handled by deadline checks in scouts/pipeline
];

/** Preferred conference topics — used by the conferences scout. */
export const conferenceTopics = [
  "javascript", "web", "python", "ai", "data", "devops", "security", "cloud",
];

/** Subreddits watched by the Reddit scout (work-request & hiring communities). */
export const subreddits = [
  "forhire",
  "freelance_forhire",
  "remotejs",
  "HireaDeveloper",
  "jobbit",
  "webdev",
  "startups",
  "INAT",
];

/** Keyword filter applied to subreddit posts (title+body, lowercase). */
export const redditIncludeKeywords = [
  "[hiring]", "[task]", "[paid]", "looking for", "need a developer", "need a designer",
  "web developer", "video editor", "landing page", "website", "dashboard", "saas",
  "mvp", "redesign", "poster", "thumbnail",
];

/** Exclude posts that are freelancers advertising (not buyers). */
export const redditExcludeKeywords = [
  "[for hire]", "[available]", "i will", "portfolio", "my services", "dm me for work",
];

/** Tests for the internship scout's HTML-table parser (imported from internships.ts). */

import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRows } from "../src/lib/scouts/internships";

const SAMPLE = `
## 💻 Software Engineering Internship Roles

<table>
<thead>
<tr><th>Company</th><th>Role</th><th>Location</th><th>Application</th><th>Age</th></tr>
</thead>
<tbody>
<tr>
<td><strong><a href="https://simplify.jobs/c/Acme?utm_source=GHList">Acme Corp</a></strong></td>
<td>Software Engineer Intern</td>
<td>Dallas, TX</td>
<td><div align="center"><a href="https://acme.wd1.myworkdayjobs.com/job/Intern_R-1?utm_source=Simplify&amp;ref=Simplify"><img src="https://i.imgur.com/fbjwDvo.png" alt="Apply"></a> <a href="https://simplify.jobs/p/abc-123?utm_source=GHList"><img src="https://i.imgur.com/aVnQdox.png" alt="Simplify"></a></div></td>
<td>0d</td>
</tr>
<tr>
<td>🔥 <strong><a href="https://simplify.jobs/c/Beta?utm_source=GHList">Beta Labs</a></strong></td>
<td>Frontend Developer Intern 🎓</td>
<td><details><summary><strong>4 locations</strong></summary>Tampa, FL<br>NYC<br>Remote</details></td>
<td><div align="center"><a href="https://jobs.ashbyhq.com/beta/abc/application?embed=true&amp;utm_source=Simplify"><img src="https://i.imgur.com/fbjwDvo.png" alt="Apply"></a> <a href="https://simplify.jobs/p/def-456?utm_source=GHList"><img src="https://i.imgur.com/aVnQdox.png" alt="Simplify"></a></div></td>
<td>2d</td>
</tr>
<tr>
<td><strong><a href="https://simplify.jobs/c/Acme?utm_source=GHList">Acme Corp</a></strong></td>
<td>Software Engineer Intern</td>
<td>Dallas, TX</td>
<td><div align="center"><a href="https://acme.wd1.myworkdayjobs.com/job/Intern_R-1?utm_source=Simplify&amp;ref=Simplify"><img src="https://i.imgur.com/fbjwDvo.png" alt="Apply"></a></div></td>
<td>0d</td>
</tr>
</tbody>
</table>
`;

test("internship parser extracts company, role, location and apply URL from HTML rows", () => {
  const rows = parseRows(SAMPLE);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].company, "Acme Corp");
  assert.equal(rows[0].role, "Software Engineer Intern");
  assert.equal(rows[0].location, "Dallas, TX");
  // Picks the careers-page link, not the simplify.jobs tracking badge.
  assert.equal(rows[0].url, "https://acme.wd1.myworkdayjobs.com/job/Intern_R-1?utm_source=Simplify&ref=Simplify");
  assert.equal(rows[1].company, "Beta Labs");
  assert.ok(rows[1].location.includes("Tampa, FL"));
  assert.equal(rows[1].url, "https://jobs.ashbyhq.com/beta/abc/application?embed=true&utm_source=Simplify");
});

test("internship parser skips header rows and dedupes identical company+role rows", () => {
  const rows = parseRows(SAMPLE + SAMPLE);
  assert.equal(rows.length, 2);
});

test("internship parser returns empty array for markdown-table input", () => {
  assert.deepEqual(parseRows("| [Acme](https://acme.com) | SF | |\n"), []);
});

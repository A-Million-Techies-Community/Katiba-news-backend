# Katiba News Sourcing

## Purpose
Find new material from Kenya Law and a small set of official sources, then organize it for human editors and authors.

## Sources
| Priority | Source | Material to monitor |
|---|---|---|
| Primary | [Kenya Law](https://new.kenyalaw.org/) | Gazette notices, judgments, and recent legislation |
| Supporting | [Parliament](https://www.parliament.go.ke/the-national-assembly/house-business/bill-tracker) | Bills and parliamentary updates |
| Supporting | [Judiciary](https://judiciary.go.ke/judiciary-news/) | Court announcements; decisions through its official decisions collection |

Kenya Law is the main source. Parliament and Judiciary provide complementary material and corroboration. Add another official source only for a defined coverage need after verifying its identity and access method. News publishers are not part of this initial source list.

## Mechanism
1. Check: a scheduled worker checks each approved source for newly available material. Use a supported feed or API where available, otherwise permitted webpage monitoring. An API or feed has not yet been confirmed for every source.
2. Capture: save the original title, source name, original URL, publication date when available, discovery time, and a permitted excerpt or document reference. Keep original documents linked to their source.
3. Compare: identify the item by source ID or canonical URL, and compare its content fingerprint. Skip unchanged items. For meaningful changes, retain the earlier version and flag the update.
4. Organize: apply topic tags and suggest links between related items. Keep each source record and attribution separate. An editor can correct grouping.
5. Present: place new leads and updates in the source inbox. Display publication and discovery times separately. Include direct links for verification.
6. Select: the human editor checks the original material, assesses relevance, and selects or dismisses the lead. Selection creates an author assignment with source links and a reporting brief.
7. Report: the human author researches, corroborates, and writes. The human editor then reviews the article through the existing editorial process.

## What the editor and author receive
- Original title, source name, and original link.
- Available excerpt or document reference.
- Source publication date and discovery time.
- Topic tags and related source links.
- Change history for updated material.
- Editor notes, brief, and author assignment.

## Responsibilities
| Role | Responsibility |
|---|---|
| Sourcing system | Collect, compare, organize, maintain the source inbox, and report collection failures |
| Human editor | Verify leads, select or dismiss, assign authors, and review articles |
| Human author | Investigate, corroborate, and write original reporting |

## Operational details
- Configure check intervals per source. An initial 5-15 minute interval is a target only where access rules and source capacity support it.
- Record the last attempt, last successful check, and latest error.
- On failure, log and retry with backoff; alert after repeated failures. Continue checking other sources.
- Track new, selected, assigned, and dismissed leads. Keep updates as separate flags so source changes do not overwrite editor decisions or notes.
- Official publication establishes where an item came from; the editor still evaluates its meaning, relevance, and claims.

## Reading and editing the diagram
The Mermaid file has three sections: official sources, automated sourcing, and human editorial work. Node definitions appear first; connections appear below them. Descriptive identifiers such as KenyaLaw, Inbox, Editor, and Author replace single-letter identifiers. Short labels keep the diagram readable; this document holds the detailed rules.

Lines beginning with %% are comments for the person editing the file. A .mmd file contains diagram source code; open the SVG to view the finished flowchart without a Mermaid renderer.

## Scope
The output is an organized source inbox and an editorial handoff. Automated article writing, automatic publication, reader-feed delivery, and legal-research tools are outside this mechanism.

## Files
- news-sourcing-flow.svg: visual flowchart.
- news-sourcing-flow.mmd: editable Mermaid flowchart.
- README.md: source priorities, mechanism, and responsibilities.

The diagram describes the intended mechanism; source integrations still need implementation and validation.

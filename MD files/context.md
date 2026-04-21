## Problem

Residents in Edinburg, McAllen, and Mission want quick awareness of local government decisions and developments, but the information is scattered across sites and long meeting videos.

## Appetite

Hackathon MVP: a working end-to-end demo that produces a daily feed and playable auto-generated clips for a small set of jurisdictions.

## Solution direction

Build a Feedly-style 3-pane reader UI wired to a daily batch pipeline:
- Ingest public sources (starting with a small, explicit set per city)
- Transcribe meeting videos
- Select one high-signal segment per 30-minute window
- Generate clips (prefer ~60s, hard max 3 minutes)
- Publish feed items tagged by locality + categories

## Open questions

- [ ] What are the initial official sources per city (web pages + meeting video channels)?
- [ ] Should clip selection favor agenda-backed segments when agendas are available?
- [ ] Should opening an item mark it as read immediately, or after a short delay?

## Decisions

MVP scope:
- UI: Feedly-style reader (3 panes)
- Jurisdictions: Edinburg, McAllen, Mission
- Clips: 1 per 30 minutes, <= 3 minutes (prefer ~60 seconds)

## Out of scope

For MVP:
- Full RGV-wide coverage
- Real-time processing during live meetings
- Advanced personalization/ranking beyond filters

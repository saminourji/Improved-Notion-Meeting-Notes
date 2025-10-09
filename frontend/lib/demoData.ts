// Use public/ absolute paths so <img src> resolves without Next Image loader
const IvanPortrait = '/Ivan_portrait.png';
const ShirPortrait = '/Shir_portrait.png';
const SamiPortrait = '/Sami_portrait.png';
const SarahPortrait = '/Sarah_portrait.png';

export type DemoSpeaker = {
  name: string;
  metadata: { profilePhoto: string };
};

export const demoSpeakers: DemoSpeaker[] = [
  { name: "Ivan Zhao",  metadata: { profilePhoto: IvanPortrait } },
  { name: "Shir Yehoshua",  metadata: { profilePhoto: ShirPortrait } },
  { name: "Sarah Sachs", metadata: { profilePhoto: SarahPortrait } },
  { name: "Sami Nourji",  metadata: { profilePhoto: SamiPortrait } },
];

export const demoParticipants = ["Ivan Zhao", "Shir Yehoshua", "Sarah Sachs", "Sami Nourji"];

export const demoTranscript = [
  { start: 0.0, end: 3.0, speaker: "Speaker 1", matched_speaker: "Ivan Zhao", text: "Okay team, let's discuss adding speaker detection in AI meeting notes. Goal: accurate per-person attribution with @mentions and action items." },
  { start: 3.1, end: 8.0, speaker: "Speaker 2", matched_speaker: "Shir Yehoshua", text: "Enrollment should be lightweight: a 30–45s guided script to capture a clean voiceprint. We'll store an embedding only, not raw audio, to keep it privacy-friendly." },
  { start: 8.1, end: 13.5, speaker: "Speaker 3", matched_speaker: "Sarah Sachs", text: "During processing, we diarize first, then compare cluster centroids against enrolled profiles. If confidence < threshold, we label as Person N and avoid misattribution." },
  { start: 13.6, end: 18.5, speaker: "Speaker 4", matched_speaker: "Sami Nourji", text: "In the UI, transcript lines show speaker badges with avatars from profiles. Action items render under each person using @<name> so they're scannable and editable." },
  { start: 18.6, end: 23.2, speaker: "Speaker 2", matched_speaker: "Shir Yehoshua", text: "We should expose a 'Resolve speaker' control to manually fix a mislabeled segment. That correction should improve future matches for that user." },
  { start: 23.3, end: 28.0, speaker: "Speaker 3", matched_speaker: "Sarah Sachs", text: "Reliability: we'll tune the similarity threshold to balance recall vs precision and log borderline cases for offline analysis." },
  { start: 28.1, end: 34.0, speaker: "Speaker 1", matched_speaker: "Ivan Zhao", text: "Rollout: start with internal and power users. If feedback is good, we'll default-enable for new meeting notes where at least two profiles are enrolled." },
];

export const demoSummaryMarkdown = `
### Implementation Plan

- Use lightweight enrollment (30–45s) to generate voice embeddings (no raw audio stored)
- Pipeline: diarization → cluster centroid matching → attribution → transcript and @mentions
- Confidence threshold prevents misattribution; unresolved clusters show as Person N

### UX & Product Decisions

- Show speaker badges with avatars; allow manual “Resolve speaker” on any segment
- Action items group by person using @Ivan Zhao, @Shir Yehoshua, @Sarah Sachs, @Sami Nourji for quick scanning
- Keep the UI Notion-native: clean, minimal, and editable everywhere

### Privacy & Reliability

- Store embeddings only; provide delete controls from Speaker Setup
- Tune similarity threshold for precision; log borderline cases for evaluation
- Fallbacks: Person 1/2 labels, and easy manual correction that improves future matches

### Rollout Strategy

- Phase 1: internal + opted-in power users; monitor accuracy and UX friction
- Phase 2: default-on when ≥2 enrolled speakers are present
- Documentation and short onboarding for enrollment best practices

### Action Items

- [ ] @Sami Nourji: Record product demo and polish "Thinking…" states
- [ ] @Ivan Zhao: Finalize matching thresholds and add evaluation dashboards
- [ ] @Shir Yehoshua: Ship the "Resolve speaker" interaction and persistence
- [ ] @Sarah Sachs: Validate transcript formatting and per-person action items
`;

export const demoActionItemsMarkdown = `
- [ ] @Sami Nourji: Finish and polish the demo
- [ ] @Ivan Zhao: Review and tune diarization/matching thresholds
- [ ] @Shir Yehoshua: Finalize enrollment and "Resolve speaker" UX copy
- [ ] @Sarah Sachs: QA transcript rendering and mentions formatting
`;



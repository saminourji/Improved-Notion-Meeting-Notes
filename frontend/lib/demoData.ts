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

export const demoParticipants = [
  { name: "Ivan Zhao", matched: true },
  { name: "Shir Yehoshua", matched: true },
  { name: "Sarah Sachs", matched: true },
  { name: "Sami Nourji", matched: true }
];

export const demoTranscript = [
  { start: 0.0, end: 3.0, speaker: "Speaker 1", matched_speaker: "Ivan Zhao", text: "Okay team, let's discuss how we're going to be implementing speaker detection in Improved AI Meeting Summary!" },
  { start: 3.1, end: 6.0, speaker: "Speaker 2", matched_speaker: "Shir Yehoshua", text: "Yes, excited to see what Sami did" },
  { start: 6.1, end: 9.5, speaker: "Speaker 3", matched_speaker: "Sarah Sachs", text: "We're from the same school, can you believe it?" },
  { start: 9.6, end: 12.5, speaker: "Speaker 4", matched_speaker: "Sami Nourji", text: "You got the 1T OAI award, can you believe it?" },
  { start: 12.6, end: 15.0, speaker: "Speaker 1", matched_speaker: "Ivan Zhao", text: "What are you doing here!" },
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

- [ ] @Ivan Zhao: Tell @Shir Yehoshua to hire @Sami Nourji @Today
- [ ] @Shir Yehoshua: Tell @Sami Nourji to hire @Ivan Zhao @Today
- [ ] @Sarah Sachs: What?
`;

export const demoActionItemsMarkdown = `
- [ ] @Ivan Zhao: Tell @Shir Yehoshua to hire @Sami Nourji @Today
- [ ] @Shir Yehoshua: Tell @Sami Nourji to hire @Ivan Zhao @Today
- [ ] @Sarah Sachs: What?
`;



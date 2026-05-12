---
phase: 6
plan: 5
wave: 2
depends_on: []
files_modified:
  - src/components/comments/voice-recorder.tsx
  - src/components/comments/audio-player.tsx
  - src/components/comments/comment-thread.tsx
autonomous: true

must_haves:
  truths:
    - "Users can record voice notes using their microphone"
    - "Voice notes upload to Supabase Storage and attach to comments"
    - "Voice notes play inline in the comment thread with native controls"
  artifacts:
    - "src/components/comments/voice-recorder.tsx exists"
    - "src/components/comments/audio-player.tsx exists"
---

# Plan 6.5: Voice Notes on Comments

<objective>
Add voice note recordings to the comment system. Designers often prefer verbal feedback over typing. Users can record, upload, and play back audio within comment threads.

Purpose: Faster, richer feedback — especially for creative review.
Output: Voice recorder component, audio player, integration with comment thread.
</objective>

<context>
Load for context:
- EOD-FLOW-PROJECT-BRIEF.md (Section 8.4 — Voice note attachments)
- src/components/comments/comment-thread.tsx (integrate recorder + player)
- src/lib/storage.ts (upload audio files to Supabase Storage)
- src/app/actions/comments.ts (addComment — need to support audioUrl)
</context>

<tasks>

<task type="auto">
  <name>Build voice recorder + audio player components</name>
  <files>
    src/components/comments/voice-recorder.tsx
    src/components/comments/audio-player.tsx
  </files>
  <action>
    1. VoiceRecorder — "use client":
       - "Record" button (mic icon) — starts MediaRecorder API
       - While recording: show elapsed time counter + pulsing red dot + "Stop" button
       - On stop: creates a Blob (audio/webm), uploads to Supabase Storage via uploadFile()
       - Returns the uploaded URL to parent via onRecorded(url) callback
       - Handles permission denied gracefully (show "Microphone access required" message)
       - Max recording: 120 seconds (auto-stop with warning)
       - Brutalist styling: red recording indicator, mono timer text
    
    2. AudioPlayer — "use client":
       - Minimal inline player for audio URLs
       - Play/Pause button + progress bar + duration label
       - Uses native HTML5 <audio> element under the hood
       - Styled to match brutalist design (bg-card-muted, brutalist-border)
       - Shows waveform-like visual (simple CSS bars or dots)
    
    AVOID: Using a recording library — MediaRecorder API is native and well-supported.
    AVOID: WAV format — use webm (smaller files, good browser support).
  </action>
  <verify>npx tsc --noEmit passes</verify>
  <done>VoiceRecorder captures audio via MediaRecorder, uploads to storage. AudioPlayer provides inline playback.</done>
</task>

<task type="auto">
  <name>Integrate voice notes into comment thread</name>
  <files>
    src/components/comments/comment-thread.tsx
    src/app/actions/comments.ts
  </files>
  <action>
    1. Update addComment action:
       - Add optional `audioUrl?: string` parameter
       - Store audioUrl in the comment content or as metadata
       - If audioUrl provided, set content to "[Voice Note]" if content is empty
    
    2. Update CommentThread:
       - Add VoiceRecorder next to the text input (mic icon button)
       - When voice note recorded: auto-submit comment with audioUrl
       - In CommentBubble: if comment has audioUrl, render AudioPlayer inline
       - Show "🎤 Voice Note" label above the player

    AVOID: Replacing the text input — voice notes are ADDITIONAL, not a replacement.
  </action>
  <verify>npx tsc --noEmit passes</verify>
  <done>Comment thread has mic button. Voice notes record, upload, and play back inline in comment bubbles.</done>
</task>

</tasks>

<verification>
After all tasks, verify:
- [ ] `npx tsc --noEmit` passes
- [ ] VoiceRecorder uses MediaRecorder API
- [ ] AudioPlayer renders for comments with audio
</verification>

<success_criteria>
- [ ] All tasks verified
- [ ] Must-haves confirmed
</success_criteria>

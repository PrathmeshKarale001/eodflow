---
phase: 6
plan: 1
wave: 1
depends_on: []
files_modified:
  - src/components/annotations/image-annotator.tsx
  - src/components/annotations/annotation-pin.tsx
  - src/app/actions/annotations.ts
  - src/components/files/file-preview-modal.tsx
autonomous: true

must_haves:
  truths:
    - "Users can click on an image/PDF preview to place a pin marker"
    - "Each pin stores {x%, y%, comment, userId, fileId} in the Comment model's annotationData JSON"
    - "Existing pins render as numbered circles on the image overlay"
    - "Clicking a pin scrolls to / highlights the related comment"
  artifacts:
    - "src/components/annotations/image-annotator.tsx exists"
    - "src/app/actions/annotations.ts exists"
---

# Plan 6.1: Image/PDF Annotation System

<objective>
Build a canvas overlay annotation system for creative review. Managers and Admins can pin feedback directly on images and PDFs ("Move this logo 2px left" with a marker on the exact spot).

Purpose: Eliminates vague revision feedback — annotations provide precise, visual context.
Output: Annotator component, annotation CRUD actions, integration with file preview modal.
</objective>

<context>
Load for context:
- EOD-FLOW-PROJECT-BRIEF.md (Section 8.4 — Communication layer, annotation spec)
- src/components/files/file-preview-modal.tsx (current preview — needs annotation overlay)
- src/components/comments/comment-thread.tsx (annotation pins link to comments)
- src/app/actions/comments.ts (Comment model has annotationData JSON field)
- prisma/schema.prisma (Comment.annotationData field)
</context>

<tasks>

<task type="auto">
  <name>Create annotation server actions</name>
  <files>src/app/actions/annotations.ts</files>
  <action>
    Create server actions for annotation CRUD:
    
    1. `addAnnotation(data: { taskId, fileId, x, y, content })`:
       - Creates a Comment with `annotationData: { x, y, fileId, pinNumber }` JSON
       - x, y are PERCENTAGE positions (0-100) relative to the image, NOT pixels
       - Auto-assigns pinNumber based on count of existing annotations for that file
       - Creates COMMENT_ADDED notification for task assignee
       
    2. `getFileAnnotations(fileId: string)`:
       - Fetches all Comments where annotationData contains the fileId
       - Returns with user info and pin coordinates
       
    3. `deleteAnnotation(commentId: string)`:
       - Deletes the annotation comment (RBAC: owner or Manager+)
    
    AVOID: Using pixel positions — they break on different screen sizes. Use percentages.
    AVOID: Creating a new Annotation model — reuse Comment with annotationData JSON.
  </action>
  <verify>npx tsc --noEmit passes with zero errors on annotations.ts</verify>
  <done>Three server actions exist: addAnnotation, getFileAnnotations, deleteAnnotation. All use percentage coordinates stored in Comment.annotationData.</done>
</task>

<task type="auto">
  <name>Build the ImageAnnotator component</name>
  <files>
    src/components/annotations/image-annotator.tsx
    src/components/annotations/annotation-pin.tsx
  </files>
  <action>
    Create a "use client" ImageAnnotator component:
    
    1. `ImageAnnotator` — wraps an image (or PDF page) in a position:relative container:
       - Renders the image at full width
       - Overlays existing annotation pins at their percentage positions
       - On click (when in annotation mode): places a new pin and opens a small input popover
       - Submit in popover calls `addAnnotation` server action
       - Toggle button "📌 Annotate" to enter/exit annotation mode
       - Annotation mode changes cursor to crosshair
    
    2. `AnnotationPin` — renders a numbered circle at a given {x%, y%}:
       - Small circle (24px) with pin number inside
       - Hover shows tooltip with annotation text + author name
       - Click opens the annotation content inline
       - Uses brutalist design tokens (bg-primary, text-on-primary, brutalist-border)
       - Position: absolute, left: {x}%, top: {y}%, transform: translate(-50%, -50%)
    
    AVOID: Heavy canvas libraries — use pure CSS position:absolute for pins.
    AVOID: Fabric.js — too heavy for simple pin annotations. Pure HTML overlay is sufficient.
  </action>
  <verify>npx tsc --noEmit passes with zero errors for both components</verify>
  <done>ImageAnnotator renders pins over images using percentage positions. AnnotationPin shows numbered markers with hover tooltips. Annotation mode enables click-to-pin.</done>
</task>

<task type="auto">
  <name>Integrate annotator into file preview modal</name>
  <files>src/components/files/file-preview-modal.tsx</files>
  <action>
    Modify FilePreviewModal to use ImageAnnotator:
    
    1. When file is an image (mimeType includes "image"):
       - Replace the plain <img> with <ImageAnnotator src={file.fileUrl} fileId={file.id} taskId={taskId} />
       - Pass taskId prop through from the parent component
    
    2. Add an "Annotations" section below the preview:
       - List all annotations for this file with pin numbers
       - Each shows: pin#, author name, annotation text, timestamp
       - Click on an annotation highlights the corresponding pin
    
    3. For PDFs: Keep the existing iframe preview (annotation on PDFs is a stretch goal)
    
    AVOID: Breaking the version history sidebar — annotation only affects the image preview area.
  </action>
  <verify>npx tsc --noEmit passes with zero errors</verify>
  <done>FilePreviewModal shows annotations overlay on images. Users can add new pins and view existing annotations inline.</done>
</task>

</tasks>

<verification>
After all tasks, verify:
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] ImageAnnotator component renders pins at percentage positions
- [ ] Annotation data is stored in Comment.annotationData JSON
- [ ] FilePreviewModal integrates the annotator for image files
</verification>

<success_criteria>
- [ ] All tasks verified
- [ ] Must-haves confirmed
- [ ] Pins render correctly using percentage-based positioning
</success_criteria>

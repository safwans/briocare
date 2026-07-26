-- Widen every column that holds model-generated or free-text prose.
--
-- Prisma maps `String` to VARCHAR(191) on MySQL. That is fine for a name or a status, but note
-- bodies and claim text are written by the note-generation model and routinely run past 191
-- characters, so `processSession()` died with P2000 "value too long for the column's type" the
-- first time a real (non-fixture) note was generated. Fixtures and seeds happened to be short
-- enough to hide it. gcsUri is here for the same reason: a signed recording URL is long.
ALTER TABLE `NoteSection`
  MODIFY `bodyDraft`  TEXT NOT NULL,
  MODIFY `bodyEdited` TEXT NULL;

ALTER TABLE `NoteClaim`
  MODIFY `text`         TEXT NOT NULL,
  MODIFY `verifierNote` TEXT NULL;

ALTER TABLE `Goal`
  MODIFY `text` TEXT NOT NULL;

ALTER TABLE `MediaTrack`
  MODIFY `gcsUri` TEXT NOT NULL;

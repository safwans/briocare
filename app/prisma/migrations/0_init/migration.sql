-- CreateTable
CREATE TABLE `Org` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `orgId` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'THERAPIST', 'PATIENT', 'GUARDIAN') NOT NULL,
    `email` VARCHAR(191) NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `authSubject` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_authSubject_key`(`authSubject`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Clinician` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `credential` VARCHAR(191) NOT NULL,
    `licensedStates` JSON NOT NULL,

    UNIQUE INDEX `Clinician_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Cohort` (
    `id` VARCHAR(191) NOT NULL,
    `orgId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL DEFAULT '',
    `name` VARCHAR(191) NOT NULL,
    `focus` ENUM('SOCIAL_ANXIETY', 'MOOD_DEPRESSION', 'EMOTION_REGULATION') NOT NULL,
    `meetsOn` VARCHAR(191) NOT NULL,
    `meetsAt` VARCHAR(191) NOT NULL DEFAULT '4:00 PM',
    `ageBandLow` INTEGER NOT NULL,
    `ageBandHigh` INTEGER NOT NULL,
    `sessionCount` INTEGER NOT NULL,
    `status` ENUM('FORMING', 'ACTIVE', 'DISCHARGED') NOT NULL DEFAULT 'FORMING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CohortClinician` (
    `cohortId` VARCHAR(191) NOT NULL,
    `clinicianId` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'facilitator',

    PRIMARY KEY (`cohortId`, `clinicianId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Patient` (
    `id` VARCHAR(191) NOT NULL,
    `orgId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `dob` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Patient_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Guardian` (
    `id` VARCHAR(191) NOT NULL,
    `orgId` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `contact` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Enrollment` (
    `id` VARCHAR(191) NOT NULL,
    `cohortId` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `status` ENUM('INVITED', 'ACTIVE', 'DISCHARGED', 'WITHDRAWN') NOT NULL DEFAULT 'INVITED',

    UNIQUE INDEX `Enrollment_cohortId_patientId_key`(`cohortId`, `patientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Goal` (
    `id` VARCHAR(191) NOT NULL,
    `enrollmentId` VARCHAR(191) NOT NULL,
    `text` VARCHAR(191) NOT NULL,
    `status` ENUM('MET', 'ON_TRACK', 'EMERGING', 'DECLINING', 'AT_RISK', 'OFF_TRACK') NOT NULL DEFAULT 'EMERGING',
    `order` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(191) NOT NULL,
    `cohortId` VARCHAR(191) NOT NULL,
    `index` INTEGER NOT NULL,
    `module` VARCHAR(191) NOT NULL,
    `scheduledAt` DATETIME(3) NOT NULL,
    `status` ENUM('SCHEDULED', 'LIVE', 'ENDED', 'PROCESSING', 'READY', 'FAILED') NOT NULL DEFAULT 'SCHEDULED',
    `roomId` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Attendance` (
    `id` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `present` BOOLEAN NOT NULL DEFAULT false,
    `joinedAt` DATETIME(3) NULL,
    `leftAt` DATETIME(3) NULL,

    UNIQUE INDEX `Attendance_sessionId_patientId_key`(`sessionId`, `patientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MediaTrack` (
    `id` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `gcsUri` VARCHAR(191) NOT NULL,
    `durationS` INTEGER NULL,

    UNIQUE INDEX `MediaTrack_sessionId_patientId_key`(`sessionId`, `patientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Transcript` (
    `id` VARCHAR(191) NOT NULL,
    `trackId` VARCHAR(191) NOT NULL,
    `segments` JSON NOT NULL,
    `lowConfSpans` JSON NOT NULL,

    UNIQUE INDEX `Transcript_trackId_key`(`trackId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EngagementEvent` (
    `id` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `type` ENUM('JOIN', 'LEAVE', 'CAMERA_ON', 'CAMERA_OFF', 'SPEAKING_START', 'SPEAKING_END', 'CHAT') NOT NULL,
    `atMs` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EngagementMetric` (
    `id` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `talkS` INTEGER NOT NULL,
    `turns` INTEGER NOT NULL,
    `cameraOnPct` INTEGER NOT NULL,
    `presencePct` INTEGER NOT NULL,
    `chatCount` INTEGER NOT NULL,
    `participationIndex` DOUBLE NOT NULL,
    `status` ENUM('ESTABLISHING', 'CHECK_IN', 'WORTH_A_LOOK', 'WATCH', 'STABLE', 'IMPROVING') NOT NULL,

    UNIQUE INDEX `EngagementMetric_sessionId_patientId_key`(`sessionId`, `patientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Baseline` (
    `id` VARCHAR(191) NOT NULL,
    `enrollmentId` VARCHAR(191) NOT NULL,
    `talkS` DOUBLE NULL,
    `turns` DOUBLE NULL,
    `cameraOnPct` DOUBLE NULL,
    `presencePct` DOUBLE NULL,
    `chatCount` DOUBLE NULL,
    `participationIndex` DOUBLE NULL,
    `sessionsSeen` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `Baseline_enrollmentId_key`(`enrollmentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `IndividualNote` (
    `id` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'IN_REVIEW', 'APPROVED') NOT NULL DEFAULT 'DRAFT',
    `templateVer` VARCHAR(191) NOT NULL,
    `goalSignals` JSON NOT NULL,
    `approvedBy` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,

    UNIQUE INDEX `IndividualNote_sessionId_patientId_key`(`sessionId`, `patientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GroupNote` (
    `id` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'IN_REVIEW', 'APPROVED') NOT NULL DEFAULT 'DRAFT',
    `templateVer` VARCHAR(191) NOT NULL,
    `goalIndicators` JSON NOT NULL,
    `approvedBy` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,

    UNIQUE INDEX `GroupNote_sessionId_key`(`sessionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NoteSection` (
    `id` VARCHAR(191) NOT NULL,
    `individualNoteId` VARCHAR(191) NULL,
    `groupNoteId` VARCHAR(191) NULL,
    `key` ENUM('PRESENTATION_SUBJECTIVE', 'PARTICIPATION', 'INTERVENTIONS_RESPONSE', 'PLAN', 'SESSION_OVERVIEW', 'GROUP_PROCESS_THEMES', 'FACILITATOR_OBSERVATIONS') NOT NULL,
    `bodyDraft` VARCHAR(191) NOT NULL,
    `bodyEdited` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NoteClaim` (
    `id` VARCHAR(191) NOT NULL,
    `sectionId` VARCHAR(191) NOT NULL,
    `text` VARCHAR(191) NOT NULL,
    `evidence` JSON NOT NULL,
    `verdict` ENUM('SUPPORTED', 'UNSUPPORTED', 'UNCERTAIN', 'CLINICIAN_ATTESTED') NOT NULL DEFAULT 'UNSUPPORTED',
    `verifierNote` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RiskFlag` (
    `id` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `category` ENUM('SELF_HARM_SI', 'HARM_TO_OTHERS', 'MANDATED_REPORTER', 'ACUTE_CLINICAL') NOT NULL,
    `severity` ENUM('ACUTE', 'ELEVATED', 'ROUTINE') NOT NULL,
    `evidence` JSON NOT NULL,
    `status` ENUM('DETECTED', 'TRIAGED', 'DISPOSITIONED', 'ACKNOWLEDGED', 'ESCALATED', 'CLOSED') NOT NULL DEFAULT 'DETECTED',
    `disposition` ENUM('NONE', 'REVIEWED', 'ADDRESSED', 'FOLLOW_UP', 'ESCALATED') NOT NULL DEFAULT 'NONE',
    `ackBy` VARCHAR(191) NULL,
    `ackAt` DATETIME(3) NULL,
    `slaDueAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ConsentRecord` (
    `id` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `guardianId` VARCHAR(191) NOT NULL,
    `scope` ENUM('TREATMENT', 'RECORDING', 'ML_TRAINING') NOT NULL,
    `state` ENUM('PENDING', 'GRANTED', 'DECLINED', 'REVOKED') NOT NULL DEFAULT 'PENDING',
    `usState` VARCHAR(191) NOT NULL,
    `grantedAt` DATETIME(3) NULL,
    `revokedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditEvent` (
    `id` VARCHAR(191) NOT NULL,
    `orgId` VARCHAR(191) NOT NULL,
    `actorId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `meta` JSON NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_orgId_fkey` FOREIGN KEY (`orgId`) REFERENCES `Org`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Clinician` ADD CONSTRAINT `Clinician_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Cohort` ADD CONSTRAINT `Cohort_orgId_fkey` FOREIGN KEY (`orgId`) REFERENCES `Org`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CohortClinician` ADD CONSTRAINT `CohortClinician_cohortId_fkey` FOREIGN KEY (`cohortId`) REFERENCES `Cohort`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CohortClinician` ADD CONSTRAINT `CohortClinician_clinicianId_fkey` FOREIGN KEY (`clinicianId`) REFERENCES `Clinician`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Patient` ADD CONSTRAINT `Patient_orgId_fkey` FOREIGN KEY (`orgId`) REFERENCES `Org`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Patient` ADD CONSTRAINT `Patient_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Guardian` ADD CONSTRAINT `Guardian_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Enrollment` ADD CONSTRAINT `Enrollment_cohortId_fkey` FOREIGN KEY (`cohortId`) REFERENCES `Cohort`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Enrollment` ADD CONSTRAINT `Enrollment_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Goal` ADD CONSTRAINT `Goal_enrollmentId_fkey` FOREIGN KEY (`enrollmentId`) REFERENCES `Enrollment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_cohortId_fkey` FOREIGN KEY (`cohortId`) REFERENCES `Cohort`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Attendance` ADD CONSTRAINT `Attendance_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `Session`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MediaTrack` ADD CONSTRAINT `MediaTrack_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `Session`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transcript` ADD CONSTRAINT `Transcript_trackId_fkey` FOREIGN KEY (`trackId`) REFERENCES `MediaTrack`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EngagementEvent` ADD CONSTRAINT `EngagementEvent_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `Session`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EngagementMetric` ADD CONSTRAINT `EngagementMetric_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `Session`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Baseline` ADD CONSTRAINT `Baseline_enrollmentId_fkey` FOREIGN KEY (`enrollmentId`) REFERENCES `Enrollment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IndividualNote` ADD CONSTRAINT `IndividualNote_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `Session`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GroupNote` ADD CONSTRAINT `GroupNote_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `Session`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NoteSection` ADD CONSTRAINT `NoteSection_individualNoteId_fkey` FOREIGN KEY (`individualNoteId`) REFERENCES `IndividualNote`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NoteSection` ADD CONSTRAINT `NoteSection_groupNoteId_fkey` FOREIGN KEY (`groupNoteId`) REFERENCES `GroupNote`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NoteClaim` ADD CONSTRAINT `NoteClaim_sectionId_fkey` FOREIGN KEY (`sectionId`) REFERENCES `NoteSection`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RiskFlag` ADD CONSTRAINT `RiskFlag_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `Session`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConsentRecord` ADD CONSTRAINT `ConsentRecord_guardianId_fkey` FOREIGN KEY (`guardianId`) REFERENCES `Guardian`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

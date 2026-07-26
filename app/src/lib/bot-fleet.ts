"use client";

import DailyIframe, { type DailyCall } from "@daily-co/daily-js";

// Browser-only. AI-driven "patients" that really join the session's Daily room, one at a time —
// the therapist taps "Simulate via AI" on a specific teen's tile and that teen walks in.
//
// Each bot is its own Daily call object (allowMultipleCallInstances) publishing a Web Audio
// destination node as its microphone, so synthesized speech travels the same WebRTC path a real
// teen's voice would and Daily's live transcription attributes it to that patientId. Bots are
// send-only (subscribeToTracksAutomatically: false), which keeps several peers in one tab cheap.

export type FleetBot = {
  patientId: string;
  name: string;
  firstName: string;
  initials: string;
  voice: string;
  token: string;
  profile: string;
  status: string;
  present: boolean;
  goals: string[];
};

export type FleetPayload = {
  roomUrl: string;
  sessionId: string;
  cohortName: string;
  module: string;
  bots: FleetBot[];
};

export type TranscriptCb = (speaker: { userId: string; text: string; isTherapist: boolean }) => void;
export type AsrCb = (state: "on" | "off" | "error") => void;

type Ev = { patientId: string; type: string; atMs: number };

type LocalAudioState = { tracks?: { audio?: { state?: string; off?: Record<string, boolean> } } };

class Bot {
  call: DailyCall | null = null;
  private dest: MediaStreamAudioDestinationNode;
  private track: MediaStreamTrack;
  private source: AudioBufferSourceNode | null = null;
  /** Set when the mic never reached "playable" — the bot is in the room but inaudible. */
  micIssue: string | null = null;

  constructor(readonly info: FleetBot, private ctx: AudioContext) {
    this.dest = ctx.createMediaStreamDestination();
    this.track = this.dest.stream.getAudioTracks()[0];
  }

  async join(roomUrl: string) {
    this.call = DailyIframe.createCallObject({
      allowMultipleCallInstances: true,
      strictMode: false,
      subscribeToTracksAutomatically: false,
      audioSource: this.track,
      videoSource: false,
    });
    await this.call.join({
      url: roomUrl,
      token: this.info.token,
      startVideoOff: true,
      startAudioOff: false,
    });

    // The room is created with start_audio_off:true, and daily-js only forwards `startAudioOff`
    // to the server-side call machine rather than acting on it — so re-assert the synthetic mic
    // explicitly once we're actually in. Without this the bot joins muted and, because
    // LiveRoom only renders an <audio> element for participants whose track is "playable",
    // nobody ever hears it.
    await this.call.setInputDevicesAsync({ audioSource: this.track, videoSource: false }).catch(() => {});
    this.call.setLocalAudio(true);
    this.micIssue = await this.confirmMicLive();
  }

  /** Poll our own participant record until the mic is publishing, so a dead bot can't pass silently. */
  private async confirmMicLive(timeoutMs = 4000): Promise<string | null> {
    const started = Date.now();
    let audio: { state?: string; off?: Record<string, boolean> } | undefined;
    while (Date.now() - started < timeoutMs) {
      const local = (this.call?.participants() as Record<string, LocalAudioState> | undefined)?.local;
      audio = local?.tracks?.audio;
      if (audio?.state === "playable") return null;
      await new Promise((r) => setTimeout(r, 250));
    }
    // `off` carries the reason (byUser / byRemoteRequest / byCanSendPermission / byServerLimit),
    // which is what distinguishes "room forced us muted" from "permission denied".
    const reason = Object.entries(audio?.off ?? {})
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(", ");
    return `${this.info.firstName}'s mic never went live (track ${audio?.state ?? "unknown"}${reason ? `, ${reason}` : ""}) — you won't hear them.`;
  }

  /** Play an already-decoded utterance out of this bot's mic. Resolves when it finishes. */
  speak(buffer: AudioBuffer): Promise<void> {
    return new Promise((resolve) => {
      this.stop();
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      // Only to the destination node — never to ctx.destination, so it doesn't also come out of
      // the local speakers. The therapist hears it back through Daily, like any remote participant.
      src.connect(this.dest);
      src.onended = () => {
        if (this.source === src) this.source = null;
        window.clearTimeout(guard);
        resolve();
      };
      this.source = src;
      src.start();
      // Never let a turn hang forever: if the audio thread is suspended (a backgrounded tab, say)
      // `onended` may never fire, and an unresolved utterance deadlocks the director for good.
      const guard = window.setTimeout(() => {
        if (this.source === src) this.source = null;
        resolve();
      }, (buffer.duration + 3) * 1000);
    });
  }

  /** Cut the current utterance short (barge-in). */
  stop() {
    if (!this.source) return;
    try {
      this.source.onended = null;
      this.source.stop();
    } catch {
      /* already ended */
    }
    this.source = null;
  }

  async destroy() {
    this.stop();
    const call = this.call;
    this.call = null;
    if (call) await call.destroy().catch(() => {});
  }
}

export class BotFleet {
  private ctx: AudioContext;
  private bots = new Map<string, Bot>();
  private earId: string | null = null;
  private t0 = Date.now();
  private evBuf: Ev[] = [];
  private flushTimer: number | null = null;
  private speakingNow = new Map<string, boolean>();
  /** Bots that joined but whose mic never published — they're in the room and inaudible. */
  readonly micIssues = new Map<string, string>();
  private onTranscriptCb: TranscriptCb | null = null;
  private onAsrCb: AsrCb | null = null;
  private disposed = false;

  constructor(readonly payload: FleetPayload, ctx: AudioContext) {
    this.ctx = ctx;
  }

  /** Every teen on the roster, joined or not. */
  get roster(): FleetBot[] {
    return this.payload.bots;
  }

  /** Only the teens currently being simulated — the director's candidate pool. */
  get activeBots(): FleetBot[] {
    return this.payload.bots.filter((b) => this.bots.has(b.patientId));
  }

  isActive(patientId: string): boolean {
    return this.bots.has(patientId);
  }

  listen(onTranscript: TranscriptCb, onAsr: AsrCb) {
    this.onTranscriptCb = onTranscript;
    this.onAsrCb = onAsr;
  }

  /** Bring one teen into the room. */
  async add(patientId: string): Promise<void> {
    if (this.disposed || this.bots.has(patientId)) return;
    const info = this.payload.bots.find((b) => b.patientId === patientId);
    if (!info) throw new Error("not on this session's roster");

    const bot = new Bot(info, this.ctx);
    await bot.join(this.payload.roomUrl);
    if (this.disposed) {
      await bot.destroy();
      return;
    }
    if (this.bots.size === 0) this.t0 = Date.now();
    this.bots.set(patientId, bot);
    if (bot.micIssue) this.micIssues.set(patientId, bot.micIssue);

    if (this.flushTimer === null) {
      // LiveRoom flushes its own capture every 5s; match that cadence.
      this.flushTimer = window.setInterval(() => this.flush(), 5000);
    }
    if (!this.earId) this.wireEar(patientId);
  }

  /** Send one teen home. */
  async remove(patientId: string): Promise<void> {
    const bot = this.bots.get(patientId);
    if (!bot) return;
    this.mark(patientId, "SPEAKING_END");
    this.bots.delete(patientId);
    this.micIssues.delete(patientId);
    await bot.destroy();

    // The ear is just whichever bot happened to be first in — hand it off if that one leaves.
    if (this.earId === patientId) {
      this.earId = null;
      const next = this.bots.keys().next().value;
      if (next) this.wireEar(next);
    }
    if (this.bots.size === 0) {
      if (this.flushTimer) window.clearInterval(this.flushTimer);
      this.flushTimer = null;
      this.flush();
    }
  }

  /**
   * Watch the room's live transcription through one bot. Every participant receives
   * `transcription-message` once the owner (the therapist's LiveRoom) starts transcription, so
   * listening on a single bot is enough — LiveRoom's own capture is untouched.
   */
  private wireEar(patientId: string) {
    const call = this.bots.get(patientId)?.call;
    if (!call) return;
    this.earId = patientId;

    // Whether the room is actually transcribing decides whether the bots can hear the therapist
    // at all. LiveRoom starts transcription inside a bare try/catch, so a Daily plan without it
    // fails silently — surface it rather than leaving the conversational loop mysteriously dead.
    call.on("transcription-started", () => this.onAsrCb?.("on"));
    call.on("transcription-stopped", () => this.onAsrCb?.("off"));
    call.on("transcription-error", () => this.onAsrCb?.("error"));
    call.on("transcription-message", (e: unknown) => {
      const msg = e as { participantId?: string; text?: string };
      if (!msg?.participantId || !msg.text) return;
      const parts = call.participants() as Record<string, { user_id?: string } | undefined>;
      const userId = parts?.[msg.participantId]?.user_id;
      if (!userId) return;
      this.onTranscriptCb?.({ userId, text: msg.text, isTherapist: userId.startsWith("clinician-") });
    });
  }

  /** Fetch, decode, and speak one line as the given teen. Resolves when the audio finishes. */
  async say(patientId: string, text: string): Promise<void> {
    const bot = this.bots.get(patientId);
    if (!bot || this.disposed) return;

    const res = await fetch("/api/sim/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice: bot.info.voice }),
    });
    if (!res.ok || this.disposed) return;

    // Raw 16-bit little-endian mono PCM — see the comment in /api/sim/tts for why this isn't WAV.
    const rate = Number(res.headers.get("X-Sample-Rate")) || 24000;
    const bytes = await res.arrayBuffer();
    if (this.disposed || bytes.byteLength < 2 || !this.bots.has(patientId)) return;
    const pcm = new Int16Array(bytes, 0, Math.floor(bytes.byteLength / 2));
    const buffer = this.ctx.createBuffer(1, pcm.length, rate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < pcm.length; i++) channel[i] = pcm[i] / 32768;

    // LiveRoom never emits these, but engagement.ts computes talkS/turns from exactly this pair —
    // so without them a simulated session would produce metrics of all zeroes.
    this.mark(patientId, "SPEAKING_START");
    try {
      await bot.speak(buffer);
    } finally {
      this.mark(patientId, "SPEAKING_END");
    }
  }

  /** True while any bot is mid-utterance. */
  get speaking(): boolean {
    return [...this.speakingNow.values()].some(Boolean);
  }

  /** Barge-in: the therapist started talking over the group. */
  interrupt() {
    for (const [patientId, bot] of this.bots) {
      if (this.speakingNow.get(patientId)) {
        bot.stop();
        this.mark(patientId, "SPEAKING_END");
      }
    }
  }

  private mark(patientId: string, type: "SPEAKING_START" | "SPEAKING_END") {
    if (type === "SPEAKING_START" && this.speakingNow.get(patientId)) return;
    if (type === "SPEAKING_END" && !this.speakingNow.get(patientId)) return;
    this.speakingNow.set(patientId, type === "SPEAKING_START");
    this.evBuf.push({ patientId, type, atMs: Date.now() - this.t0 });
  }

  private flush() {
    if (!this.evBuf.length) return;
    const payload = JSON.stringify({ events: this.evBuf.splice(0) });
    const url = `/api/session/${this.payload.sessionId}/events`;
    // sendBeacon so a buffered batch still lands when the tab is closing — same reason
    // LiveRoom uses it for its own capture.
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([payload], { type: "application/json" }));
    } else {
      void fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  }

  async destroy() {
    this.disposed = true;
    if (this.flushTimer) window.clearInterval(this.flushTimer);
    this.flushTimer = null;
    for (const patientId of this.bots.keys()) this.mark(patientId, "SPEAKING_END");
    this.flush();
    await Promise.all([...this.bots.values()].map((b) => b.destroy()));
    this.bots.clear();
    this.earId = null;
  }
}

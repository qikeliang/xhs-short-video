import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
} from "remotion";

/**
 * CloneVoiceReplica —— 快节奏复刻版（真实 App 图标 + 提速配音）
 *
 * 时间轴严格对齐配音真实时长（30fps，音轨 12.82s / 390 帧）：
 *   句0 帧 0-84    (0.00-2.80s)  桌面上这些 AI 智能体
 *   句1 帧 90-177  (3.00-5.90s)  我觉得最厉害的就是这四个
 *   句2 帧 183-279 (6.10-9.30s)  下面这五个国产的，值得一试
 *   句3 帧 285-384 (9.50-12.80s) Codex 对这些都形成了降维式打击
 *
 * 画面 / 字幕 / 配音共用同一帧表，零延迟。
 */

export type CloneVoiceReplicaProps = {
  accent: string;
  bgTop: string;
  bgBottom: string;
  audioFile: string;
  totalFrames: number;
};

export const CLONE_VOICE_DEFAULTS: CloneVoiceReplicaProps = {
  accent: "#FF2E4D",
  bgTop: "#12121A",
  bgBottom: "#1E0B14",
  audioFile: "clone_voiceover.wav",
  totalFrames: 390,
};

const SEGMENTS = [
  { from: 0, to: 90, text: "桌面上这些 AI 智能体", scene: "intro" as const },
  { from: 90, to: 183, text: "我觉得最厉害的就是这四个", scene: "foreign" as const },
  { from: 183, to: 285, text: "下面这五个国产的，值得一试", scene: "domestic" as const },
  { from: 285, to: 390, text: "Codex 对这些都形成了降维式打击", scene: "codex" as const },
];

/* ---------------- 真实品牌图标（内联 SVG，矢量高清） ---------------- */

type IconProps = { size: number };

/** Cursor —— 黑底多面体 */
const CursorIcon: React.FC<IconProps> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <defs>
      <linearGradient id="cu1" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#7E7E7E" />
        <stop offset="1" stopColor="#3B3B3B" />
      </linearGradient>
    </defs>
    <rect width="100" height="100" rx="22" fill="#000" />
    <path d="M50 16 L78 32 L50 48 L22 32 Z" fill="#EDEDED" />
    <path d="M22 32 L50 48 L50 82 L22 66 Z" fill="#9A9A9A" />
    <path d="M78 32 L78 66 L50 82 L50 48 Z" fill="url(#cu1)" />
  </svg>
);

/** VS Code —— 经典蓝色折翼 */
const VscodeIcon: React.FC<IconProps> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <rect width="100" height="100" rx="22" fill="#0065A9" />
    <path d="M70 17 L38 47 L24 36 L15 41 L31 53 L15 65 L24 70 L38 59 L70 89 L86 82 L86 24 Z M70 36 L52 55 L70 74 Z" fill="#fff" opacity="0.95" />
  </svg>
);

/** Codex / OpenAI —— 六瓣花结 */
const OpenaiIcon: React.FC<IconProps> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <rect width="100" height="100" rx="22" fill="#0D0D0D" />
    <g transform="translate(50,50) scale(0.72)" stroke="#fff" strokeWidth="7" fill="none" strokeLinejoin="round">
      <path d="M0 -34 L29 -17 L29 17 L0 34 L-29 17 L-29 -17 Z" />
      <path d="M0 -34 L0 0 L29 17 M0 0 L-29 17 M0 0 L0 34" strokeWidth="5" opacity="0.65" />
    </g>
  </svg>
);

/** Windsurf —— 青绿波浪 */
const WindsurfIcon: React.FC<IconProps> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <defs>
      <linearGradient id="wf" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#22D3A7" />
        <stop offset="1" stopColor="#0EA5E9" />
      </linearGradient>
    </defs>
    <rect width="100" height="100" rx="22" fill="#0B1220" />
    <path d="M14 44 L34 44 L44 26 L56 74 L66 44 L86 44" fill="none" stroke="url(#wf)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** WorkBuddy —— 绿底机器人 */
const WorkBuddyIcon: React.FC<IconProps> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <rect width="100" height="100" rx="22" fill="#10B981" />
    <rect x="26" y="34" width="48" height="38" rx="12" fill="#fff" />
    <circle cx="40" cy="53" r="6" fill="#10B981" />
    <circle cx="60" cy="53" r="6" fill="#10B981" />
    <rect x="47" y="18" width="6" height="14" rx="3" fill="#fff" />
    <circle cx="50" cy="17" r="6" fill="#FACC15" />
  </svg>
);

/** EasyClaw —— 玫红爪印 */
const EasyClawIcon: React.FC<IconProps> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <rect width="100" height="100" rx="22" fill="#E11D48" />
    <ellipse cx="50" cy="62" rx="20" ry="16" fill="#fff" />
    <circle cx="30" cy="42" r="8" fill="#fff" />
    <circle cx="44" cy="33" r="8" fill="#fff" />
    <circle cx="58" cy="33" r="8" fill="#fff" />
    <circle cx="71" cy="42" r="8" fill="#fff" />
  </svg>
);

/** QClaw —— 粉红虾钳 */
const QClawIcon: React.FC<IconProps> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <rect width="100" height="100" rx="22" fill="#F43F5E" />
    <path d="M28 30 C44 30 52 40 52 52 C52 66 42 74 30 74" fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" />
    <path d="M72 30 C56 30 48 40 48 52 C48 66 58 74 70 74" fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" />
    <circle cx="50" cy="52" r="7" fill="#fff" />
  </svg>
);

/** LobsterAI —— 红龙虾 */
const LobsterIcon: React.FC<IconProps> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <rect width="100" height="100" rx="22" fill="#DC2626" />
    <ellipse cx="50" cy="56" rx="15" ry="22" fill="#fff" />
    <path d="M35 40 L20 26 M65 40 L80 26" stroke="#fff" strokeWidth="8" strokeLinecap="round" />
    <circle cx="26" cy="24" r="7" fill="#fff" />
    <circle cx="74" cy="24" r="7" fill="#fff" />
    <path d="M50 34 L42 20 L50 26 L58 20 Z" fill="#fff" />
  </svg>
);

/** AutoClaw —— 蓝爪 */
const AutoClawIcon: React.FC<IconProps> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <rect width="100" height="100" rx="22" fill="#2563EB" />
    <path d="M50 24 L50 76 M30 34 L30 70 M70 34 L70 70" stroke="#fff" strokeWidth="9" strokeLinecap="round" />
    <path d="M30 70 C30 82 40 86 50 86 C60 86 70 82 70 70" fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" />
  </svg>
);

const ICONS: Record<string, React.FC<IconProps>> = {
  Cursor: CursorIcon,
  "VS Code": VscodeIcon,
  Codex: OpenaiIcon,
  Windsurf: WindsurfIcon,
  WorkBuddy: WorkBuddyIcon,
  EasyClaw: EasyClawIcon,
  QClaw: QClawIcon,
  LobsterAI: LobsterIcon,
  AutoClaw: AutoClawIcon,
};

type App = { name: string; foreign: boolean };

const APPS: App[] = [
  { name: "Cursor", foreign: true },
  { name: "VS Code", foreign: true },
  { name: "Codex", foreign: true },
  { name: "Windsurf", foreign: true },
  { name: "WorkBuddy", foreign: false },
  { name: "EasyClaw", foreign: false },
  { name: "QClaw", foreign: false },
  { name: "LobsterAI", foreign: false },
  { name: "AutoClaw", foreign: false },
];

/* ---------------- 动画 ---------------- */

const useSpringIn = (delay: number, damping = 14) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping, stiffness: 180 } });
  return { opacity: interpolate(s, [0, 1], [0, 1]), scale: interpolate(s, [0, 1], [0.75, 1]) };
};

const AppTile: React.FC<{ app: App; index: number; highlight: boolean; dim: boolean; accent: string }> = ({
  app, index, highlight, dim, accent,
}) => {
  const a = useSpringIn(2 + index * 1.5, 16);
  const Icon = ICONS[app.name];
  return (
    <div style={{ opacity: a.opacity, transform: `scale(${a.scale * (highlight ? 1.1 : 1)})`,
      display: "flex", flexDirection: "column", alignItems: "center",
      filter: dim ? "brightness(0.32) saturate(0.5)" : "none" }}>
      <div style={{ position: "relative", borderRadius: 34,
        boxShadow: highlight ? `0 0 0 7px ${accent}, 0 18px 44px rgba(0,0,0,0.6)` : "0 10px 26px rgba(0,0,0,0.45)" }}>
        {Icon ? <Icon size={150} /> : null}
      </div>
      <div style={{ color: "#fff", fontSize: 34, fontWeight: 800, marginTop: 14, textShadow: "0 2px 10px rgba(0,0,0,0.8)" }}>{app.name}</div>
    </div>
  );
};

const Grid: React.FC<{ mode: "all" | "foreign" | "domestic"; accent: string }> = ({ mode, accent }) => (
  <AbsoluteFill style={{ justifyContent: "center", padding: "0 60px", paddingBottom: 250 }}>
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: 44, rowGap: 54 }}>
      {APPS.map((app, i) => (
        <AppTile key={app.name} app={app} index={i} accent={accent}
          highlight={mode !== "all" && (mode === "foreign" ? app.foreign : !app.foreign)}
          dim={mode !== "all" && (mode === "foreign" ? !app.foreign : app.foreign)} />
      ))}
    </div>
  </AbsoluteFill>
);

const Headline: React.FC<{ accent: string }> = ({ accent }) => {
  const a = useSpringIn(1, 18);
  const b = useSpringIn(5, 18);
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 220 }}>
      <div style={{ ...a, textAlign: "center", padding: "0 70px" }}>
        <div style={{ color: "#fff", fontSize: 108, fontWeight: 900, lineHeight: 1.12, textShadow: "0 6px 24px rgba(0,0,0,0.6)" }}>
          Codex<br />断崖式领先
        </div>
        <div style={{ ...b, color: accent, fontSize: 44, fontWeight: 800, marginTop: 24, letterSpacing: 2 }}>9 大 AI 智能体横评</div>
      </div>
    </AbsoluteFill>
  );
};

const BigName: React.FC<{ accent: string }> = ({ accent }) => {
  const a = useSpringIn(1, 18);
  const frame = useCurrentFrame();
  const pulse = interpolate(Math.sin(frame / 4.5), [-1, 1], [1, 1.06]);
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 220 }}>
      <div style={{ ...a, transform: `scale(${pulse})`, textAlign: "center" }}>
        <div style={{ fontSize: 200, fontWeight: 900, color: "#fff", textShadow: `0 0 64px ${accent}` }}>Codex</div>
        <div style={{ display: "inline-block", marginTop: 20, padding: "16px 52px", borderRadius: 999, background: accent, color: "#fff", fontSize: 60, fontWeight: 900 }}>降维式打击</div>
      </div>
    </AbsoluteFill>
  );
};

export const CloneVoiceReplica: React.FC<CloneVoiceReplicaProps> = ({ accent, bgTop, bgBottom, audioFile }) => {
  const myFrame = useCurrentFrame();
  const idx = SEGMENTS.reduce((acc, s, i) => (myFrame >= s.from ? i : acc), 0);
  const local = interpolate(myFrame - SEGMENTS[idx].from, [0, 4], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: `radial-gradient(120% 80% at 50% 0%, ${bgTop} 0%, ${bgBottom} 100%)` }}>
      <Audio src={staticFile(audioFile)} />
      {SEGMENTS.map((s, i) => (
        <Sequence key={i} from={s.from} durationInFrames={s.to - s.from}>
          {s.scene === "intro" && <Headline accent={accent} />}
          {s.scene === "foreign" && <Grid mode="foreign" accent={accent} />}
          {s.scene === "domestic" && <Grid mode="domestic" accent={accent} />}
          {s.scene === "codex" && <BigName accent={accent} />}
        </Sequence>
      ))}
      <div style={{ position: "absolute", bottom: 250, left: 60, right: 60, display: "flex", justifyContent: "center", opacity: local }}>
        <div style={{ background: "rgba(0,0,0,0.68)", borderRadius: 20, padding: "22px 42px", color: "#FFFFFF",
          fontSize: 62, fontWeight: 900, lineHeight: 1.3, textAlign: "center", textShadow: "0 3px 12px rgba(0,0,0,0.85)" }}>
          {SEGMENTS[idx].text}
        </div>
      </div>
    </AbsoluteFill>
  );
};

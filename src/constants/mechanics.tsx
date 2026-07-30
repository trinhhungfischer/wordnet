import { Magnet, Link, Snowflake, Lock, Key, Bomb, Eye, Ghost, Wrench, PenTool, ArrowLeftRight, RefreshCw, Pin, Timer } from 'lucide-react';

export const MECHANICS_ICONS = {
  LinkedMain: Magnet,
  LinkedChunk: Magnet,
  Chain: Link,
  Frozen: Snowflake,
  Immovable: Pin,
  Backward: ArrowLeftRight,
  Burst: Bomb,
  Countdown: Timer,
  Key: Key,
  Lock: Lock,
  ScrewLock: Wrench,
  ScrewDriver: PenTool,
  CycleLock: RefreshCw,
  CycleFadeOut: Ghost,
  Cryptic: Eye
};

export const MECHANICS_COLORS = {
  LinkedMain: '#0ea5e9',
  LinkedChunk: '#bae6fd',
  Chain: '#818cf8',
  Frozen: '#38bdf8',
  Immovable: '#9ca3af',
  Backward: '#a855f7',
  BurstWarning: '#ef4444',
  BurstNormal: '#f97316',
  Countdown: '#ec4899',
  CycleLock: '#14b8a6',
  CycleFadeOut: '#64748b',
  Cryptic: '#c084fc',
};

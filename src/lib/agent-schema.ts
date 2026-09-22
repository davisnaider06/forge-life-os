import { z } from 'zod';
import type { Command } from './domain';

export type ChatTurn = { role: 'user' | 'assistant'; text: string };
export type AgentEvent =
  | { type: 'text'; text: string }
  | { type: 'tool'; label: string }
  | { type: 'commands'; commands: Command[] }
  | { type: 'error'; message: string }
  | { type: 'done' };

export const chatSchema = z
  .object({
    turns: z
      .array(z.object({ role: z.enum(['user', 'assistant']), text: z.string().max(8000) }))
      .min(1)
      .max(40),
    state: z.looseObject({ schema: z.literal(1) }),
  })
  .strict();

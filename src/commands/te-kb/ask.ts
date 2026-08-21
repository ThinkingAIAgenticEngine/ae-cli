import type { Command, RuntimeContext } from '../../framework/types.js';
import { kbApi } from '../../core/mcp-access.js';
import {
  ASK_API_PATH as API_PATH,
  buildFailedMessage,
  pollUntilSettled,
  transformCompletedResponse,
  type AskExecutionResponse,
} from './ask-shared.js';

const VALID_LOCALES = new Set(['zh', 'en', 'ja', 'ko']);
const MIN_QUESTION_LEN = 1;
const MAX_QUESTION_LEN = 2000;
const MIN_MAX_TURNS = 1;
const MAX_MAX_TURNS = 100;

interface KnowledgeBaseRef {
  scope: string;
  name: string;
}

function validateQuestion(question: string): void {
  const len = question.length;
  if (len < MIN_QUESTION_LEN || len > MAX_QUESTION_LEN) {
    throw new Error(
      `Invalid --question length: ${len}. Must be between ${MIN_QUESTION_LEN} and ${MAX_QUESTION_LEN} characters.`,
    );
  }
}

function validateLocale(locale: string): void {
  if (locale && !VALID_LOCALES.has(locale)) {
    throw new Error(`Invalid --locale: ${locale}. Must be one of: zh | en | ja | ko`);
  }
}

function validateMaxTurns(maxTurns: number): void {
  if (maxTurns !== 0 && (maxTurns < MIN_MAX_TURNS || maxTurns > MAX_MAX_TURNS)) {
    throw new Error(
      `Invalid --max-turns: ${maxTurns}. Must be between ${MIN_MAX_TURNS} and ${MAX_MAX_TURNS}.`,
    );
  }
}

function buildBody(ctx: RuntimeContext): Record<string, unknown> {
  const body: Record<string, unknown> = {
    question: ctx.str('question'),
  };
  const sources = ctx.json('sources') as KnowledgeBaseRef[] | undefined;
  if (sources) body.sources = sources;
  const modelId = ctx.str('model-id');
  if (modelId) body.modelId = modelId;
  const maxTurns = ctx.num('max-turns');
  if (maxTurns) body.maxTurns = maxTurns;
  const locale = ctx.str('locale');
  if (locale) body.locale = locale;
  return body;
}

export const ask: Command = {
  service: 'kb',
  command: '+ask',
  description:
    'Ask knowledge bases via LLM-powered retrieval (POST /agent/api/external/knowledge-bases/ask). Consumes platform tokens. Prefer +index -> +grep -> +read for deterministic, token-free lookup. By default, polls for completion; use --no-wait to return immediately with executionId.',
  flags: [
    {
      name: 'question',
      type: 'string',
      required: true,
      alias: 'q',
      desc: 'Natural-language question (1-2000 characters). Required.',
    },
    {
      name: 'sources',
      type: 'json',
      required: false,
      desc: 'Optional JSON array of knowledge base refs to scope the search, e.g. [{"scope":"company","name":"engineering-handbook"}]. Omit to search all accessible knowledge bases.',
    },
    {
      name: 'model-id',
      type: 'string',
      required: false,
      desc: 'Optional LLM model ID (e.g. claude-sonnet-4-6). Omit to use the platform default model.',
    },
    {
      name: 'max-turns',
      type: 'number',
      required: false,
      desc: 'Optional agent turn limit (1-100, default 50 on server when omitted).',
    },
    { name: 'locale', type: 'string', required: false, desc: 'Optional locale: zh | en | ja | ko' },
    {
      name: 'no-wait',
      type: 'boolean',
      required: false,
      desc: 'Return immediately after submission with executionId, without polling for completion.',
    },
  ],
  risk: 'read',
  validate: (ctx) => {
    validateQuestion(ctx.str('question'));
    validateLocale(ctx.str('locale'));
    validateMaxTurns(ctx.num('max-turns'));
  },
  dryRun: (ctx) => ({
    method: 'POST',
    url: `${ctx.host().replace(/\/$/, '')}${API_PATH}`,
    body: buildBody(ctx),
  }),
  execute: async (ctx) => {
    const noWait = ctx.bool('no-wait');

    const submitResponse = (await kbApi(ctx, 'POST', API_PATH, {}, buildBody(ctx))) as {
      executionId: string;
      status: string;
    };

    if (!submitResponse.executionId) {
      throw new Error('Invalid submit response: missing executionId');
    }

    const executionId = submitResponse.executionId;

    if (noWait) {
      return {
        executionId,
        status: submitResponse.status,
      };
    }

    const finalResponse = await pollUntilSettled(
      (id) => kbApi(ctx, 'GET', API_PATH, { executionId: id }) as Promise<AskExecutionResponse>,
      executionId,
    );

    if (finalResponse.status === 'completed') {
      return transformCompletedResponse(finalResponse);
    }

    if (finalResponse.status === 'failed') {
      throw new Error(buildFailedMessage(finalResponse));
    }

    throw new Error(`Unexpected execution status: ${finalResponse.status}`);
  },
};

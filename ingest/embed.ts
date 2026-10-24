// Sentence embeddings with all-MiniLM-L6-v2 (https://huggingface.co/Xenova/all-MiniLM-L6-v2), a 23 MB
// open model. Texts about the same thing get vectors with a cosine similarity close to 1.
// Downloads the model to ~/.cache/bubble/all-MiniLM-L6-v2 on first use.
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { Tokenizer } from '@huggingface/tokenizers';
import * as ort from 'onnxruntime-node';

const REPO = 'https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main';
const FILES = { 'model_quantized.onnx': 'onnx/model_quantized.onnx', 'tokenizer.json': 'tokenizer.json', 'tokenizer_config.json': 'tokenizer_config.json' };
const DIR = path.join(homedir(), '.cache', 'bubble', 'all-MiniLM-L6-v2');
const MAX_TOKENS = 256;

async function download() {
  await mkdir(DIR, { recursive: true });
  for (const [file, remote] of Object.entries(FILES)) {
    const dest = path.join(DIR, file);
    if (await stat(dest).catch(() => null)) continue;
    const res = await fetch(`${REPO}/${remote}`);
    if (!res.ok) throw new Error(`downloading ${remote}: HTTP ${res.status}`);
    await writeFile(dest, Buffer.from(await res.arrayBuffer()));
  }
}

export type Embedder = (text: string) => Promise<Float32Array>;

export async function loadEmbedder(): Promise<Embedder> {
  await download();
  const read = async (f: string) => JSON.parse(await readFile(path.join(DIR, f), 'utf8'));
  const tokenizer = new Tokenizer(await read('tokenizer.json'), await read('tokenizer_config.json'));
  const session = await ort.InferenceSession.create(path.join(DIR, 'model_quantized.onnx'));

  return async (text) => {
    const ids = tokenizer.encode(text).ids.slice(0, MAX_TOKENS);
    const tensor = (values: number[]) => new ort.Tensor('int64', BigInt64Array.from(values, BigInt), [1, values.length]);
    const out = await session.run({
      input_ids: tensor(ids),
      attention_mask: tensor(ids.map(() => 1)),
      token_type_ids: tensor(ids.map(() => 0)),
    });
    // Mean of the token vectors, scaled to length 1, so a dot product is the cosine similarity.
    const hidden = out.last_hidden_state.data as Float32Array;
    const dims = hidden.length / ids.length;
    const vector = new Float32Array(dims);
    for (let t = 0; t < ids.length; t++) for (let d = 0; d < dims; d++) vector[d] += hidden[t * dims + d] / ids.length;
    const norm = Math.hypot(...vector);
    return vector.map((v) => v / norm);
  };
}

export function similarity(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

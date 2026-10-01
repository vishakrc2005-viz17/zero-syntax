import { pipeline } from '@huggingface/transformers'
let clf: any
self.onmessage = async (e: MessageEvent) => {
  try {
    clf ||= await pipeline('audio-classification', e.data.model, { dtype: 'q8' }) // quantized
    postMessage({ out: await clf(e.data.audio, { top_k: 10 }) })
  } catch (err: any) { postMessage({ error: String(err?.message || err) }) }
}

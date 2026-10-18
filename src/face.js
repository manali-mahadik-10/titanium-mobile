// Face recognition in the browser (face-api). Models are loaded only when a face step opens.
export const MATCH = 0.55 // distance below this = same person (lower = stricter)

let api = null

export async function loadFace() {
  if (!api) {
    const f = await import('@vladmandic/face-api')
    await f.tf.ready()
    await Promise.all([
      f.nets.tinyFaceDetector.loadFromUri('/models'),
      f.nets.faceLandmark68TinyNet.loadFromUri('/models'),
      f.nets.faceRecognitionNet.loadFromUri('/models')
    ])
    api = f
  }
  return api
}

// one 128-number "face print" from the current video frame, or null if no face is clear
export async function readFace(video) {
  if (!api || !video || video.readyState < 2) return null
  const r = await api
    .detectSingleFace(video, new api.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.3 }))
    .withFaceLandmarks(true)
    .withFaceDescriptor()
  return r ? Array.from(r.descriptor) : null
}

// cheap check used for the live "face found" indicator (no face print)
export async function faceVisible(video) {
  if (!api || !video || video.readyState < 2) return false
  const r = await api.detectSingleFace(video, new api.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.3 }))
  return !!r
}

export const average = (list) => list[0].map((_, i) => list.reduce((s, d) => s + d[i], 0) / list.length)
export const dist = (a, b) => Math.hypot(...a.map((x, i) => x - b[i]))

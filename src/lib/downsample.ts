/** Min/max downsampling for overview rendering of large series. */
export function downsampleMinMax(
  time: Float64Array,
  data: Float64Array,
  maxPoints: number,
  t0?: number,
  t1?: number,
): { x: number[]; y: (number | null)[] } {
  const start = t0 ?? time[0]
  const end = t1 ?? time[time.length - 1]
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return { x: [], y: [] }
  }

  let i0 = 0
  let i1 = time.length - 1
  while (i0 < time.length && time[i0] < start) i0++
  while (i1 > i0 && time[i1] > end) i1--

  const count = i1 - i0 + 1
  if (count <= 0) return { x: [], y: [] }
  if (count <= maxPoints) {
    const x: number[] = []
    const y: (number | null)[] = []
    for (let i = i0; i <= i1; i++) {
      x.push(time[i])
      y.push(Number.isFinite(data[i]) ? data[i] : null)
    }
    return { x, y }
  }

  const buckets = Math.max(1, Math.floor(maxPoints / 2))
  const x: number[] = []
  const y: (number | null)[] = []

  for (let b = 0; b < buckets; b++) {
    const a = i0 + Math.floor((b * count) / buckets)
    const c = i0 + Math.floor(((b + 1) * count) / buckets) - 1
    let minV = Infinity
    let maxV = -Infinity
    let minT = time[a]
    let maxT = time[a]
    let any = false
    for (let i = a; i <= c; i++) {
      const v = data[i]
      if (!Number.isFinite(v)) continue
      any = true
      if (v < minV) {
        minV = v
        minT = time[i]
      }
      if (v > maxV) {
        maxV = v
        maxT = time[i]
      }
    }
    if (!any) continue
    if (minT <= maxT) {
      x.push(minT, maxT)
      y.push(minV, maxV)
    } else {
      x.push(maxT, minT)
      y.push(maxV, minV)
    }
  }

  return { x, y }
}

export function indexNearTime(time: Float64Array, t: number): number {
  let lo = 0
  let hi = time.length - 1
  if (t <= time[0]) return 0
  if (t >= time[hi]) return hi
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const v = time[mid]
    if (v === t) return mid
    if (v < t) lo = mid + 1
    else hi = mid - 1
  }
  if (lo <= 0) return 0
  if (lo >= time.length) return time.length - 1
  return Math.abs(time[lo] - t) < Math.abs(time[lo - 1] - t) ? lo : lo - 1
}

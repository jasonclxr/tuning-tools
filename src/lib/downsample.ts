/** Min/max downsampling for overview rendering of large series. */
export function downsampleMinMax(
  time: Float64Array,
  data: Float64Array,
  maxPoints: number,
  t0?: number,
  t1?: number,
): { x: number[]; y: (number | null)[] } {
  const aligned = downsampleAligned(time, [data], maxPoints, t0, t1)
  return { x: aligned.x, y: aligned.ys[0] ?? [] }
}

/**
 * Downsample several series onto a shared time axis so gaps in one channel
 * (e.g. boost only while above atmosphere) do not drop the others.
 */
export function downsampleAligned(
  time: Float64Array,
  series: Float64Array[],
  maxPoints: number,
  t0?: number,
  t1?: number,
): { x: number[]; ys: (number | null)[][] } {
  const emptyYs = () => series.map(() => [] as (number | null)[])
  const start = t0 ?? time[0]
  const end = t1 ?? time[time.length - 1]
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return { x: [], ys: emptyYs() }
  }

  let i0 = 0
  let i1 = time.length - 1
  while (i0 < time.length && time[i0] < start) i0++
  while (i1 > i0 && time[i1] > end) i1--

  const count = i1 - i0 + 1
  if (count <= 0) return { x: [], ys: emptyYs() }

  const x: number[] = []
  const ys: (number | null)[][] = emptyYs()

  if (count <= maxPoints) {
    for (let i = i0; i <= i1; i++) {
      x.push(time[i])
      for (let s = 0; s < series.length; s++) {
        const v = series[s][i]
        ys[s].push(Number.isFinite(v) ? v : null)
      }
    }
    return { x, ys }
  }

  const buckets = Math.max(1, Math.floor(maxPoints / 2))
  for (let b = 0; b < buckets; b++) {
    const a = i0 + Math.floor((b * count) / buckets)
    const c = i0 + Math.floor(((b + 1) * count) / buckets) - 1
    if (c < a) continue
    x.push(time[a], time[c])
    for (let s = 0; s < series.length; s++) {
      const data = series[s]
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
      if (!any) {
        ys[s].push(null, null)
      } else if (minT <= maxT) {
        ys[s].push(minV, maxV)
      } else {
        ys[s].push(maxV, minV)
      }
    }
  }

  return { x, ys }
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

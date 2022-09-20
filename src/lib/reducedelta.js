export const reduceDelta = a => a.reduce(...[(r, [t, ...v]) => [...r, [(((r[r.length - 1]) || [0])[0]) + t, ...v]], []])
/*
export const reduceDelta = a => {
    const b = []
    let t = 0
    for (let i = 0; i < a.length; i++) {
        const [ti, ...v] = a[i]
        t += ti
        b.push([t, ...v])
    }
    return b
}
*/
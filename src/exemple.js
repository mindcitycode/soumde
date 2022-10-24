const transposeEvent = t => e => [...e.slice(0, 3), e[3] + t, ...e.slice(4)]
const getExampleParts = () => {
    const transpose60 = transposeEvent(48 + 12)
    const part = [
        [0, 'on', 0, 0, 1],
        [0, 'on', 0, 8, 1],
        [0, 'on', 0, 14, 1],
        [1, 'off', 0, 0, 1],
        [0, 'off', 0, 8, 1],
        [0.5, 'off', 0, 14, 1],

        [1.5, 'on', 0, 2, 1],
        [1, 'off', 0, 2, 1],

        [0, 'on', 0, 3, 1],
        [1, 'off', 0, 3, 1],

        [0, 'on', 0, -1, 1],
        [3, 'off', 0, -1, 1]

    ].map(transpose60)

    const part2 = []
    {
        const dur = 0.125
        const loop = [0, 2, 3, 5, 8, 5, 3, 2]
        const count = 8 / dur
        const v = 0.2
        for (let i = 0; i < count; i++) {
            const key = loop[i % loop.length]
            part2.push(transpose60([0, 'on', 1, key, v]))
            part2.push(transpose60([dur, 'off', 1, key, v]))
        }
    }
    const part3 = []
    {
        const dur = 0.125 * 3
        const loop = [8, 7, 8]
        const count = 8 / dur
        const v = 0.2
        const channel = 2
        for (let i = 0; i < count; i++) {
            const key = loop[i % loop.length]
            part3.push(transpose60([0, 'on', channel, key, v]))
            part3.push(transpose60([dur, 'off', channel, key, v]))
        }
    }

    return [part, part2, part3]
}

export const NoteOnCache = (ac) => {
    const cache = []

    const findAndRemove = (createorFunction, channel, key) => {
        const index = cache.findIndex(cached => {
            return ((cached.createFunction === createorFunction)
                && (cached.key === key)
                && (cached.channel === channel))
        })
        if (index === -1) {
            console.error('no matching noteOn for', createorFunction, key)
        } else {
            const match = cache[index]
            cache.splice(index, 1)
            return match
        }
    }
    const set = (createFunction, channel, key, playedNoteOn, synthInUse) => {
        cache.push(({ createFunction, channel, key, playedNoteOn, synthInUse }))
    }
    const _checkEmpty = () => {
        if (cache.length) throw new Error('the cache should be empty')
    }
    return {
        findAndRemove,
        set,
        _checkEmpty
    }
}
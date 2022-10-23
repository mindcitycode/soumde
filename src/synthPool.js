class SynthInUse {
    static oldAge = 10
    createFunction = undefined
    synth = undefined
    availableAfter = undefined // undefined means never
    r = undefined
    constructor(createFunction, synth, availableAfter) {
        this.createFunction = createFunction
        this.synth = synth
        this.availableAfter = availableAfter
        this.r = Math.random()
    }
    isAvailable(createFunction, time) {
        return (this.createFunction === createFunction) && (this.availableAfter !== undefined) && (time > this.availableAfter)
    }
    notifyTimeOfUse(time) {
        if (time === undefined) {
            this.availableAfter = undefined
        } else if (this.availableAfter === undefined) {
            this.availableAfter = time
        } else if (time > this.availableAfter) {
            this.availableAfter = time
        }
    }
    isOldAndUseless(currentTime) {
        if (this.availableAfter === undefined) {
            return false
        }
        const uselessTime = currentTime - this.availableAfter
        return (uselessTime > SynthInUse.oldAge)
    }
}

export const SynthPool = (ac) => {
    const oneSampleDuration = 1 / ac.sampleRate
    const synthsInUse = []
    const getSynth = (createFunction, time) => {
        const available = synthsInUse.find(synthInUse => synthInUse.isAvailable(createFunction, time))
        if (available) {
            return { reused: true, synthInUse: available }
        } else {
            const synth = createFunction(ac)
            const synthInUse = new SynthInUse(createFunction, synth, time - oneSampleDuration)
            synthsInUse.push(synthInUse)
            return { reused: false, synthInUse }
        }
    }
    const removeOldAndUseless = (currentTime) => {
        const oneToRemoveIndex = synthsInUse.findIndex(synthInUse => synthInUse.isOldAndUseless(currentTime))
        if (oneToRemoveIndex !== -1) {
            const oneToRemove = synthsInUse[oneToRemoveIndex]
            synthsInUse.splice(oneToRemoveIndex, 1)
            // try 'remove' function if present
            if (oneToRemove.synth.remove) oneToRemove.synth.remove()
            // must be disconnected by caller
            return oneToRemove
        }
    }
    const _stats = () => synthsInUse
    return { getSynth, _stats, removeOldAndUseless }
}

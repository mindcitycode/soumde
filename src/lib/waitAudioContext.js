export const waitAudioContext = (ac, pollInterval = 500) => {
    return new Promise((accept, reject) => {
        if (ac.state === 'running') {
            return accept(ac)
        } else {
            const h = setInterval(() => ac.resume(), pollInterval)
            const onstatechange = () => {
                if (ac.state === 'running') {
                    clearInterval(h)
                    ac.removeEventListener("statechange", onstatechange)
                    accept(ac)
                }
            }
            ac.addEventListener("statechange", onstatechange)
        }
    })
}
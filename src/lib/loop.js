export const rafLoop = f => {
    const frame = () => {
        const time = performance.now()
        const dt = time - lastTime
        f(dt/1000,time/1000)
        lastTime = time
        requestAnimationFrame(frame)
    }
    let lastTime = performance.now()
    requestAnimationFrame(frame)
}
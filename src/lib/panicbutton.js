export const PanicButton = (ac, $parent = document.body) => {
    const $b = document.createElement('button')
    $b.style = `font-size : 50px ; width : 300px; height : 300px; border : 10px solid black ; border-radius : 20px`
    $b.onclick = () => {
        if (ac.state === 'running') {
            ac.suspend()
        } else if (ac.state === 'suspended') {
            ac.resume()
        }
    }
    const updateState = () => {
        $b.textContent = ac.state
        const cols = { 'running' : 'green', 'suspended' : 'orange'}
        $b.style['background-color'] = cols[ac.state]
    }
    updateState()
    ac.addEventListener("statechange", updateState)
    $parent.append($b)
}
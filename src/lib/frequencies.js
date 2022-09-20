export function ftok( f ){
    return 69 + 12 * Math.log2( f / 440 )
}
export function ktof( k ) {
    return Math.pow(2,(k-69)/12) * 440
}
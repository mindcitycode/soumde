export const assert = (condition, error) => {
    if (!condition) throw new Error(error)
}
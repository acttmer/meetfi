import Jazzicon from '@raugfer/jazzicon'

export const getJazziconDataUrl = (address: string) => {
  return 'data:image/svg+xml;base64,' + window.btoa(Jazzicon(address))
}

export function assert<T>(x: T | null | undefined): asserts x {
  if (typeof x === 'undefined' || x === null) {
    throw new Error('undefined or null value')
  }
}

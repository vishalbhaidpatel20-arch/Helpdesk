import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MobileCopyright } from '@/components/Footer'

// jsdom has no layout, so the page geometry is stubbed: the viewport height, the page's scroll height and where the
// sentinel at the end of the content is (its top edge relative to the viewport).
const VIEWPORT = 600
// 6.5rem of reserved space at the 16px root font size
const RESERVED = 104

function setGeometry({ pageHeight, sentinelTop }: { pageHeight: number; sentinelTop: number }) {
  vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(VIEWPORT)
  vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(pageHeight)
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ top: sentinelTop } as DOMRect)
}

describe('MobileCopyright', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  const strip = () => screen.getByText(/All rights reserved/)
  const scrollTo = (sentinelTop: number) => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ top: sentinelTop } as DOMRect)
    act(() => {
      window.dispatchEvent(new Event('scroll'))
    })
  }

  it('stays hidden on a page too short to scroll, even though the end of it is in view', () => {
    setGeometry({ pageHeight: VIEWPORT, sentinelTop: 200 })

    render(<MobileCopyright />)

    expect(strip()).toHaveClass('opacity-0')
  })

  it('stays hidden on a long page until the end of it is reached', () => {
    setGeometry({ pageHeight: 2000, sentinelTop: 1500 })

    render(<MobileCopyright />)

    expect(strip()).toHaveClass('opacity-0')
  })

  it('shows once the end of a long page is reached and hides again when scrolling back up', () => {
    setGeometry({ pageHeight: 2000, sentinelTop: 1500 })
    render(<MobileCopyright />)

    scrollTo(VIEWPORT - RESERVED)
    expect(strip()).toHaveClass('opacity-100')

    scrollTo(VIEWPORT - RESERVED + 50)
    expect(strip()).toHaveClass('opacity-0')
  })

  it('stops listening for scrolling when it unmounts', () => {
    const remove = vi.spyOn(window, 'removeEventListener')
    setGeometry({ pageHeight: 2000, sentinelTop: 1500 })
    const { unmount } = render(<MobileCopyright />)

    unmount()

    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function))
  })
})

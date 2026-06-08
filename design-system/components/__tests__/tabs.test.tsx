import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Tabs } from '../tabs'

describe('Tabs', () => {
  describe('string[] API (back-compat)', () => {
    it('renders each label and highlights the active one', () => {
      render(<Tabs tabs={['One', 'Two']} activeTab="Two" onTabChange={() => {}} />)
      expect(screen.getByRole('tab', { name: 'One' })).toHaveAttribute('aria-selected', 'false')
      expect(screen.getByRole('tab', { name: 'Two' })).toHaveAttribute('aria-selected', 'true')
    })

    it('fires onTabChange with the string label', () => {
      const onTabChange = vi.fn()
      render(<Tabs tabs={['One', 'Two']} activeTab="One" onTabChange={onTabChange} />)
      fireEvent.click(screen.getByRole('tab', { name: 'Two' }))
      expect(onTabChange).toHaveBeenCalledWith('Two')
    })
  })

  describe('TabItem[] API (keyed)', () => {
    it('renders dynamic labels but identifies tabs by stable key', () => {
      render(
        <Tabs
          tabs={[
            { key: 'all', label: 'All' },
            { key: 'session', label: 'Latest session — May 23' },
          ]}
          activeTab="session"
          onTabChange={() => {}}
        />
      )
      const activeTab = screen.getByRole('tab', { name: /latest session/i })
      expect(activeTab).toHaveAttribute('aria-selected', 'true')
    })

    it('fires onTabChange with the key, not the label', () => {
      const onTabChange = vi.fn()
      render(
        <Tabs
          tabs={[
            { key: 'all', label: 'All' },
            { key: 'session', label: 'Latest session' },
          ]}
          activeTab="all"
          onTabChange={onTabChange}
        />
      )
      fireEvent.click(screen.getByRole('tab', { name: /latest session/i }))
      expect(onTabChange).toHaveBeenCalledWith('session')
    })
  })
})

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('starts on character select', () => {
    render(<App />)
    expect(screen.getByText(/choose your class/i)).toBeInTheDocument()
  })

  it('moves into the dungeon after choosing a class', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /fighter/i }))
    expect(screen.getByTestId('dungeon-grid')).toBeInTheDocument()
    expect(screen.getByText(/HP: \d+\/\d+/)).toBeInTheDocument()
  })
})

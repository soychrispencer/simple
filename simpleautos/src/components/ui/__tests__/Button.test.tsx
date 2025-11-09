import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '../Button'

describe('Button', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>)

    const button = screen.getByRole('button', { name: /click me/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass('bg-primary', 'text-white', 'rounded-full')
  })

  it('renders with different variants', () => {
    const { rerender } = render(<Button variant="outline">Outline</Button>)

    expect(screen.getByRole('button')).toHaveClass('border', 'border-black/40')

    rerender(<Button variant="ghost">Ghost</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-transparent')
  })

  it('renders with different sizes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>)

    expect(screen.getByRole('button')).toHaveClass('h-8', 'px-3')

    rerender(<Button size="lg">Large</Button>)
    expect(screen.getByRole('button')).toHaveClass('h-12', 'px-5')
  })

  it('handles click events', async () => {
    const user = userEvent.setup()
    const handleClick = jest.fn()

    render(<Button onClick={handleClick}>Click me</Button>)

    await user.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('shows loading state', () => {
    render(<Button loading>Loading...</Button>)

    const button = screen.getByRole('button')
    expect(button).toHaveClass('opacity-90', 'pointer-events-none')
  })

  it('is disabled when loading', () => {
    render(<Button loading>Loading...</Button>)

    expect(screen.getByRole('button')).toBeDisabled()
  })
})

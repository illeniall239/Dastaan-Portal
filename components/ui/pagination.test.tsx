import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/tests/setup';
import userEvent from '@testing-library/user-event';
import { Pagination, PaginationCompact } from './pagination';
import type { PaginationMeta } from '@/types/pagination';

describe('Pagination', () => {
  const mockOnPageChange = vi.fn();

  const createPaginationMeta = (overrides: Partial<PaginationMeta> = {}): PaginationMeta => ({
    currentPage: 1,
    pageSize: 20,
    totalItems: 100,
    totalPages: 5,
    hasNextPage: true,
    hasPreviousPage: false,
    startIndex: 0,
    endIndex: 19,
    ...overrides,
  });

  beforeEach(() => {
    mockOnPageChange.mockClear();
  });

  it('should render pagination controls', () => {
    const meta = createPaginationMeta();
    render(<Pagination pagination={meta} onPageChange={mockOnPageChange} />);

    // Should show results info
    expect(screen.getByText(/Showing 1-20 of 100 results/i)).toBeInTheDocument();

    // Should have previous/next buttons
    expect(screen.getByLabelText(/previous page/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/next page/i)).toBeInTheDocument();
  });

  it('should not render when only one page', () => {
    const meta = createPaginationMeta({
      currentPage: 1,
      totalPages: 1,
      totalItems: 10,
      hasNextPage: false,
      hasPreviousPage: false,
      endIndex: 9,
    });
    const { container } = render(<Pagination pagination={meta} onPageChange={mockOnPageChange} />);

    // Component should render nothing for single page
    expect(container.firstChild).toBeNull();
  });

  it('should disable previous button on first page', () => {
    const meta = createPaginationMeta({ currentPage: 1, hasPreviousPage: false });
    render(<Pagination pagination={meta} onPageChange={mockOnPageChange} />);

    const previousButton = screen.getByLabelText(/previous page/i);
    expect(previousButton).toBeDisabled();
  });

  it('should disable next button on last page', () => {
    const meta = createPaginationMeta({
      currentPage: 5,
      totalPages: 5,
      hasNextPage: false,
      hasPreviousPage: true,
      startIndex: 80,
      endIndex: 99,
    });
    render(<Pagination pagination={meta} onPageChange={mockOnPageChange} />);

    const nextButton = screen.getByLabelText(/next page/i);
    expect(nextButton).toBeDisabled();
  });

  it('should call onPageChange with next page when next button clicked', async () => {
    const user = userEvent.setup();
    const meta = createPaginationMeta({
      currentPage: 2,
      hasPreviousPage: true,
      startIndex: 20,
      endIndex: 39,
    });
    render(<Pagination pagination={meta} onPageChange={mockOnPageChange} />);

    const nextButton = screen.getByLabelText(/next page/i);
    await user.click(nextButton);

    expect(mockOnPageChange).toHaveBeenCalledWith(3);
  });

  it('should call onPageChange with previous page when previous button clicked', async () => {
    const user = userEvent.setup();
    const meta = createPaginationMeta({
      currentPage: 3,
      hasPreviousPage: true,
      startIndex: 40,
      endIndex: 59,
    });
    render(<Pagination pagination={meta} onPageChange={mockOnPageChange} />);

    const previousButton = screen.getByLabelText(/previous page/i);
    await user.click(previousButton);

    expect(mockOnPageChange).toHaveBeenCalledWith(2);
  });

  it('should call onPageChange when page number clicked', async () => {
    const user = userEvent.setup();
    const meta = createPaginationMeta({ currentPage: 1 });
    render(<Pagination pagination={meta} onPageChange={mockOnPageChange} />);

    // Click on page 3 button
    const page3Button = screen.getByLabelText('Page 3');
    await user.click(page3Button);

    expect(mockOnPageChange).toHaveBeenCalledWith(3);
  });

  it('should call onPageChange to first page when first button clicked', async () => {
    const user = userEvent.setup();
    const meta = createPaginationMeta({
      currentPage: 3,
      hasPreviousPage: true,
      startIndex: 40,
      endIndex: 59,
    });
    render(<Pagination pagination={meta} onPageChange={mockOnPageChange} />);

    const firstButton = screen.getByLabelText(/first page/i);
    await user.click(firstButton);

    expect(mockOnPageChange).toHaveBeenCalledWith(1);
  });

  it('should call onPageChange to last page when last button clicked', async () => {
    const user = userEvent.setup();
    const meta = createPaginationMeta({ currentPage: 1, totalPages: 5 });
    render(<Pagination pagination={meta} onPageChange={mockOnPageChange} />);

    const lastButton = screen.getByLabelText(/last page/i);
    await user.click(lastButton);

    expect(mockOnPageChange).toHaveBeenCalledWith(5);
  });

  it('should hide first/last buttons when showFirstLast is false', () => {
    const meta = createPaginationMeta();
    render(<Pagination pagination={meta} onPageChange={mockOnPageChange} showFirstLast={false} />);

    expect(screen.queryByLabelText(/first page/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/last page/i)).not.toBeInTheDocument();
  });

  it('should hide info text when showInfo is false', () => {
    const meta = createPaginationMeta();
    render(<Pagination pagination={meta} onPageChange={mockOnPageChange} showInfo={false} />);

    expect(screen.queryByText(/Showing/i)).not.toBeInTheDocument();
  });
});

describe('PaginationCompact', () => {
  const mockOnPageChange = vi.fn();

  const createPaginationMeta = (overrides: Partial<PaginationMeta> = {}): PaginationMeta => ({
    currentPage: 1,
    pageSize: 20,
    totalItems: 100,
    totalPages: 5,
    hasNextPage: true,
    hasPreviousPage: false,
    startIndex: 0,
    endIndex: 19,
    ...overrides,
  });

  beforeEach(() => {
    mockOnPageChange.mockClear();
  });

  it('should render compact pagination', () => {
    const meta = createPaginationMeta();
    render(<PaginationCompact pagination={meta} onPageChange={mockOnPageChange} />);

    expect(screen.getByText('Page 1 of 5')).toBeInTheDocument();
    expect(screen.getByText('Previous')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
  });

  it('should not render when only one page', () => {
    const meta = createPaginationMeta({
      currentPage: 1,
      totalPages: 1,
      totalItems: 10,
      hasNextPage: false,
      hasPreviousPage: false,
      endIndex: 9,
    });
    const { container } = render(
      <PaginationCompact pagination={meta} onPageChange={mockOnPageChange} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should handle page navigation in compact mode', async () => {
    const user = userEvent.setup();
    const meta = createPaginationMeta({
      currentPage: 2,
      hasPreviousPage: true,
      startIndex: 20,
      endIndex: 39,
    });
    render(<PaginationCompact pagination={meta} onPageChange={mockOnPageChange} />);

    const nextButton = screen.getByText('Next');
    await user.click(nextButton);

    expect(mockOnPageChange).toHaveBeenCalledWith(3);
  });

  it('should disable previous button on first page', () => {
    const meta = createPaginationMeta({ currentPage: 1, hasPreviousPage: false });
    render(<PaginationCompact pagination={meta} onPageChange={mockOnPageChange} />);

    const previousButton = screen.getByText('Previous');
    expect(previousButton).toBeDisabled();
  });

  it('should disable next button on last page', () => {
    const meta = createPaginationMeta({
      currentPage: 5,
      totalPages: 5,
      hasNextPage: false,
      hasPreviousPage: true,
      startIndex: 80,
      endIndex: 99,
    });
    render(<PaginationCompact pagination={meta} onPageChange={mockOnPageChange} />);

    const nextButton = screen.getByText('Next');
    expect(nextButton).toBeDisabled();
  });
});

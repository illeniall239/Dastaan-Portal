import React from 'react';
import { cn } from '@/lib/utils';

interface Column {
  key: string;
  label: string;
  className?: string;
  mobileLabel?: string; // Optional different label for mobile
  hideOnMobile?: boolean; // Hide column on mobile entirely
}

interface ResponsiveTableProps {
  columns: Column[];
  data: any[];
  renderRow: (item: any, index: number) => React.ReactNode;
  renderMobileCard: (item: any, index: number) => React.ReactNode;
  className?: string;
  emptyMessage?: string;
}

/**
 * ResponsiveTable component that displays as a traditional table on desktop
 * and transforms into stacked cards on mobile devices.
 *
 * @example
 * ```tsx
 * <ResponsiveTable
 *   columns={[
 *     { key: 'name', label: 'Name' },
 *     { key: 'email', label: 'Email' },
 *     { key: 'role', label: 'Role' }
 *   ]}
 *   data={users}
 *   renderRow={(user) => (
 *     <>
 *       <td>{user.name}</td>
 *       <td>{user.email}</td>
 *       <td>{user.role}</td>
 *     </>
 *   )}
 *   renderMobileCard={(user) => (
 *     <div className="p-4 border rounded-lg">
 *       <h3>{user.name}</h3>
 *       <p>{user.email}</p>
 *       <span>{user.role}</span>
 *     </div>
 *   )}
 * />
 * ```
 */
export function ResponsiveTable({
  columns,
  data,
  renderRow,
  renderMobileCard,
  className,
  emptyMessage = 'No data available'
}: ResponsiveTableProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table View (hidden on mobile) */}
      <div className="hidden md:block overflow-x-auto">
        <table className={cn('min-w-full divide-y divide-border', className)}>
          <thead className="bg-muted/50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider',
                    column.className
                  )}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-background divide-y divide-border">
            {data.map((item, index) => (
              <tr
                key={index}
                className="hover:bg-muted/50 transition-colors"
              >
                {renderRow(item, index)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View (hidden on desktop) */}
      <div className="md:hidden space-y-3">
        {data.map((item, index) => (
          <div key={index} className="animate-fade-in">
            {renderMobileCard(item, index)}
          </div>
        ))}
      </div>
    </>
  );
}

/**
 * Simple responsive table that automatically transforms table cells to cards
 * using data-label attributes.
 */
export function SimpleResponsiveTable({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="min-w-full divide-y divide-border mobile-table-card">
        {children}
      </table>
    </div>
  );
}

/**
 * Mobile-optimized table cell that displays label on mobile
 */
export function ResponsiveTableCell({
  label,
  children,
  className
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td
      data-label={label}
      className={cn('px-6 py-4 whitespace-nowrap mobile-table-cell', className)}
    >
      {children}
    </td>
  );
}

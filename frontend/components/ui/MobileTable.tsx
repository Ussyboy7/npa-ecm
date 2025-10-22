"use client";

import React from "react";

interface Column<T = Record<string, unknown>> {
  key: string;
  label: string;
  render?: (value: unknown, item: T) => React.ReactNode;
  className?: string;
}

interface MobileTableProps<T = Record<string, unknown>> {
  data: T[];
  columns: Column[];
  keyField: string;
  className?: string;
  mobileCardClass?: string;
}

export const MobileTable = <T extends Record<string, unknown> = Record<string, unknown>>({
  data,
  columns,
  keyField,
  className = "",
  mobileCardClass = "bg-white rounded-lg shadow-sm border p-4 mb-4"
}) => {
  return (
    <>
      {/* Desktop Table View */}
      <div className={`hidden md:block ${className}`}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((column, index) => (
                  <th
                    key={column.key}
                    className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.className || ""}`}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((item) => (
                <tr key={item[keyField]} className="hover:bg-gray-50">
                  {columns.map((column) => (
                    <td key={column.key} className={`px-6 py-4 whitespace-nowrap ${column.className || ""}`}>
                      {column.render
                        ? column.render(item[column.key], item)
                        : item[column.key]
                      }
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {data.map((item) => (
          <div key={item[keyField]} className={mobileCardClass}>
            {columns.map((column, index) => (
              <div key={column.key} className={`flex justify-between items-center py-2 ${index !== 0 ? "border-t border-gray-100" : ""}`}>
                <span className="text-sm font-medium text-gray-500">{column.label}:</span>
                <span className="text-sm text-gray-900">
                  {column.render
                    ? column.render(item[column.key], item)
                    : item[column.key]
                  }
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
};

export default MobileTable;


import React from 'react';

/**
 * Highlights matching text in a string
 */
export function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim() || !text) {
    return text;
  }

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, index) => {
        if (part.toLowerCase() === query.toLowerCase()) {
          return (
            <mark key={index} className="bg-yellow-200 dark:bg-yellow-900 px-0.5 rounded">
              {part}
            </mark>
          );
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </>
  );
}


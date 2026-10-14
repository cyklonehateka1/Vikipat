import { useEffect } from 'react';

/** Sets the document title per page. */
export function useTitle(title: string) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}

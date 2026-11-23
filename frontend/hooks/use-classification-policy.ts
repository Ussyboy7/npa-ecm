"use client";

import { useEffect, useState } from 'react';

import {
  fetchClassificationPolicy,
  getCachedClassificationPolicy,
  type ClassificationPolicy,
} from '@/lib/classification-policy';

/**
 * The served classification thresholds, loaded once per session.
 *
 * Returns null until the request settles; callers fall back to showing no
 * clearance guidance rather than guessing a rule the server did not send.
 */
export const useClassificationPolicy = (): ClassificationPolicy | null => {
  const [policy, setPolicy] = useState<ClassificationPolicy | null>(() =>
    getCachedClassificationPolicy(),
  );

  useEffect(() => {
    if (policy) return;
    let active = true;
    fetchClassificationPolicy()
      .then((next) => {
        if (active) setPolicy(next);
      })
      .catch(() => {
        // The server still enforces; the UI simply shows no guidance.
      });
    return () => {
      active = false;
    };
  }, [policy]);

  return policy;
};

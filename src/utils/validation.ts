import { z } from 'zod';

export const validateUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const validateSubdomain = (subdomain: string): boolean => {
  return /^[a-z0-9-]+$/.test(subdomain) && subdomain.length >= 3 && subdomain.length <= 50;
};

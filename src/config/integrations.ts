// Build-time integration settings for pages and components (see config/integrations.mjs).
import { integrations as read } from '../../config/integrations.mjs';

export const integrations = read(process.env);

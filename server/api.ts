import { Router } from 'express';
import { access } from 'fs/promises';
import { resolve } from 'path';
import { loadSettings, saveSettings } from './settings';

const router = Router();

router.get('/settings', (_req, res) => {
  const settings = loadSettings();
  res.json(settings);
});

router.put('/settings', (req, res) => {
  saveSettings(req.body);
  res.json({ status: 'saved' });
});

router.post('/open', async (req, res) => {
  const { filePath } = req.body as { filePath?: string };

  if (!filePath || typeof filePath !== 'string') {
    res.status(400).json({ error: 'filePath is required and must be a string' });
    return;
  }

  const resolved = resolve(filePath);

  try {
    await access(resolved);
  } catch {
    res.status(404).json({ error: `File not found: ${resolved}` });
    return;
  }

  res.json({ filePath: resolved });
});

export default router;

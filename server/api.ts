import { Router } from 'express';
import { access } from 'fs/promises';
import { resolve } from 'path';

const router = Router();

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

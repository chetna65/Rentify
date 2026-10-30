import { Router } from 'express';
import { readFileSync } from 'node:fs';

const router = Router();

const assistanceData = JSON.parse(
  readFileSync(new URL('../data/rentalAssistance.json', import.meta.url), 'utf8')
);

// Public read-only endpoints
router.get('/scam-alerts', (req, res) => {
  res.json({
    status: 'success',
    data: assistanceData.scamAlerts,
  });
});

router.get('/legal', (req, res) => {
  res.json({
    status: 'success',
    data: assistanceData.legalGuidance,
  });
});

router.get('/schemes', (req, res) => {
  res.json({
    status: 'success',
    data: assistanceData.governmentSchemes,
  });
});

export default router;

import express from 'express';
import { sendReminderEmail } from '../lib/mail';
import { protect } from '../middlewares/auth.middleware';

const router = express.Router();

router.post('/send', protect, async (req: any, res: any) => {
  try {
    const { email, note } = req.body;
    
    if (!email || !note) {
      return res.status(400).json({ message: 'Email and note content are required' });
    }

    await sendReminderEmail(email, note);
    
    res.status(200).json({ message: 'Reminder email sent successfully' });
  } catch (error) {
    console.error('[Reminder Route] Error:', error);
    res.status(500).json({ message: 'Failed to send reminder email' });
  }
});

export default router;

import { Router } from 'express';
import { saveTestimonial, getTestimonials, deleteTestimonial, updateTestimonial, getDownloads, saveDownload } from '../controllers/testimonial.controller';
import { protect } from '../middlewares/auth.middleware';

const router = Router();

router.use(protect);

router.post('/', saveTestimonial);
router.get('/', getTestimonials);
router.patch('/:id', updateTestimonial);
router.delete('/:id', deleteTestimonial);

router.get('/downloads', getDownloads);
router.post('/downloads', saveDownload);

export default router;

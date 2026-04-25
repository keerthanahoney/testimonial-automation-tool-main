import { Router, Request, Response } from 'express';

const router = Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const SYSTEM_PROMPT = `
You are TestimonialHub AI, a powerful assistant for the TestimonialHub application.
Your goal is to help users manage their customer feedback and create beautiful testimonial cards.
You know about the system features:
1. Dashboard: Overview of stats and recent activity.
2. Create Testimonial: Upload screenshots or paste text to generate cards.
3. Batch Processing: Bulk process multiple screenshots at once.
4. Wall of Love: View and manage all collected testimonials.
5. AI Extraction: High-precision extraction of feedback using Gemini 1.5.

Be professional, helpful, and concise.
`;

router.post('/chat', async (req: Request, res: Response): Promise<any> => {
  const { message } = req.body;
  const key = process.env.GROQ_API_KEY;

  if (!key) {
    return res.status(500).json({ error: 'Groq API Key not configured on server' });
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: message }
        ],
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    const data: any = await response.json();
    if (response.ok) {
      const reply = data.choices[0].message.content;
      res.json({ reply });
    } else {
      res.status(response.status).json({ error: data.error?.message || 'Groq API Error' });
    }
  } catch (error) {
    console.error('Groq Chat Error:', error);
    res.status(500).json({ error: 'Failed to connect to Groq service' });
  }
});

router.post('/extract', async (req: Request, res: Response): Promise<any> => {
  const { image, mimeType } = req.body;
  const key = process.env.GEMINI_API_KEY;

  if (!key) {
    return res.status(500).json({ error: 'Gemini API Key not configured on server' });
  }

  try {
    const base64Data = image.includes(',') ? image.split(',')[1] : image;
    
    const prompt = `
      Analyze this image of a chat (WhatsApp, LinkedIn, Twitter, etc.) or a review. 
      Extract the following information and structure it into a clean JSON object.
      
      Fields to extract:
      - feedback: The actual message or review text.
      - name: Full name of the person giving the feedback.
      - role: Their job title or designation (e.g. CEO, Marketing Manager).
      - company: The company they work for.
      - date: Date of the message (Format: "10 April 2024").
      - time: Time of the message (Format: "10:45 PM").
      - rating: Number 1-5 based on sentiment.
      - tone: Single word (e.g. Professional, Friendly, Excited).
      - isSupported: true if this is a valid testimonial, false otherwise.

      Return ONLY a JSON object in this format:
      { "feedback": string, "name": string, "role": string, "company": string, "date": string, "time": string, "rating": number, "tone": string, "isSupported": boolean }
    `;

    // Using gemini-flash-latest as it is the supported stable model for this API key
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${key}`;
    
    let attempt = 0;
    const maxRetries = 3;
    let lastError = null;

    while (attempt < maxRetries) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              role: "user",
              parts: [
                { text: prompt },
                { inline_data: { mime_type: mimeType || "image/png", data: base64Data } }
              ]
            }]
          })
        });

        const data: any = await response.json();
        
        if (response.ok) {
          const text = data.candidates[0].content.parts[0].text;
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            return res.json(JSON.parse(jsonMatch[0]));
          } else {
            throw new Error('Failed to parse AI response');
          }
        } else if (response.status === 503 || response.status === 429) {
          // Retry on 503 Service Unavailable or 429 Too Many Requests
          console.warn(`Gemini API overloaded (Status ${response.status}). Retrying... attempt ${attempt + 1}`);
          lastError = data.error?.message || 'Gemini API Error';
        } else {
          // Unrecoverable error (e.g., 400 Bad Request, 401 Unauthorized)
          return res.status(response.status).json({ error: data.error?.message || 'Gemini API Error' });
        }
      } catch (err: any) {
        lastError = err.message || 'Network error';
      }

      attempt++;
      if (attempt < maxRetries) {
        // Exponential backoff: 1.5s, 3s
        await new Promise(resolve => setTimeout(resolve, attempt * 1500));
      }
    }

    // If we've exhausted all retries
    console.error('Gemini API exhausted retries. Last error:', lastError);
    return res.status(503).json({ error: 'AI Service is currently experiencing extremely high demand. Please try again in a few moments.' });
  } catch (error) {
    console.error('Gemini Extraction Error:', error);
    res.status(500).json({ error: 'Failed to process image with AI' });
  }
});

export default router;

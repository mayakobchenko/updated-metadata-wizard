import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { writeFile, readFile } from 'fs/promises'

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Route to handle form submissions, to save json file
router.post('/submit-metadata', async (req, res) => {
  try {
    const formData = req.body;
    const filePath = path.join(__dirname, '../submissions.json');

    let submissions;
    try {
      const data = await readFile(filePath, 'utf-8');
      submissions = JSON.parse(data);
    } catch (err) {
      submissions = [];
    }
    submissions.push(formData);
    await writeFile(filePath, JSON.stringify(submissions, null, 2));

    res.status(200).json({ message: 'Form data saved successfully!' });
  } catch (error) {
    console.error('Error saving form data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// test GET endpoint
router.get('/hello', (req, res) => {
  res.json({ message: 'Hello from backend' });
  console.log(`${req.method} ${req.url}`);
});

// test POST endpoint
router.post('/testpost', (req, res) => {
  const data = req.body;
  console.log('Received data:', data);
  res.status(200).json({ status: 'success test', received: data });
});

export default router;
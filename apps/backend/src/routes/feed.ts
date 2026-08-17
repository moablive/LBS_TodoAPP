import { Router } from 'express';
import { db, schema } from '@todoapp/db';
import { eq } from 'drizzle-orm';
import { generateUserIcsFeed } from '../calendar/export.js';

export const feedRouter = Router();

feedRouter.get('/:token.ics', async (req, res) => {
  const token = req.params.token;
  if (!token) {
    return res.status(400).send('Token inválido');
  }

  try {
    const prefs = await db.query.userPrefs.findFirst({
      where: eq(schema.userPrefs.icsExportToken, token)
    });

    if (!prefs) {
      return res.status(404).send('Calendário não encontrado ou token inválido');
    }

    const icsContent = await generateUserIcsFeed(prefs.userId);

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="todoapp.ics"');
    res.send(icsContent);
  } catch (error) {
    console.error('Erro ao exportar feed ICS:', error);
    res.status(500).send('Erro interno ao gerar o feed');
  }
});

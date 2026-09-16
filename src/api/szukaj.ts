import { Router, Request, Response } from 'express';
import { Database } from 'better-sqlite3';

export const szukajRouter = (db: Database) => {
    const router = Router();
// GET /api/szukaj — wyszukiwanie pacjentów i lekarzy
    router.get('/', (req: Request, res: Response) => {
        try {
            const q = req.query.q as string;
            
            if (!q || q.trim().length < 2) {
                return res.json({ sukces: true, data: [] });
            }
            
            const parametr = `%${q.trim()}%`;
            const pacjenciSql = `
                SELECT 
                    id, 
                    imie, 
                    nazwisko, 
                    pesel AS informacje_dodatkowe, 
                    'Pacjent' AS typ 
                FROM pacjenci 
                WHERE imie LIKE ? OR nazwisko LIKE ? OR pesel LIKE ?
            `;
            const znalezieniPacjenci = db.prepare(pacjenciSql).all(parametr, parametr, parametr);
            const lekarzeSql = `
                SELECT 
                    id, 
                    imie, 
                    nazwisko, 
                    specjalizacja AS informacje_dodatkowe, 
                    'Lekarz' AS typ 
                FROM lekarze 
                WHERE imie LIKE ? OR nazwisko LIKE ? OR specjalizacja LIKE ?
            `;
            const znalezieniLekarze = db.prepare(lekarzeSql).all(parametr, parametr, parametr);
            const wyniki = [...znalezieniPacjenci, ...znalezieniLekarze];

            res.json({ 
                sukces: true, 
                znaleziono: wyniki.length,
                data: wyniki 
            });

        } catch (error: any) {
            console.error('Błąd wyszukiwarki:', error);
            res.status(500).json({ sukces: false, wiadomosc: error.message });
        }
    });

    return router;
};
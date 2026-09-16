import { Router, Request, Response } from 'express';
import { Database } from 'better-sqlite3';

/** Zapisuje zdarzenie w dzienniku audytu. */
export function zapiszAudyt(db: Database, uzytkownik: string, operacja: string, szczegoly: string) {
    try {
        const stmt = db.prepare(`
            INSERT INTO audyt (uzytkownik, operacja, szczegoly, data) 
            VALUES (?, ?, ?, datetime('now', 'localtime'))
        `);
        stmt.run(uzytkownik, operacja, szczegoly);
    } catch (error) {
        console.error('Błąd zapisu audytu:', error);
    }
}

export const audytRouter = (db: Database) => {
    const router = Router();
// GET /api/audyt — pobranie 100 najnowszych zdarzeń
    router.get('/', (req: Request, res: Response) => {
        try {
            const sql = 'SELECT * FROM audyt ORDER BY data DESC LIMIT 100';
            const wpisy = db.prepare(sql).all();
            res.json({ sukces: true, data: wpisy });
        } catch (error: any) {
            res.status(500).json({ sukces: false, wiadomosc: error.message });
        }
    });

    return router;
};
import { Router, Request, Response } from 'express';
import { Database } from 'better-sqlite3';
import { zapiszAudyt } from './audyt'; 

export const gabinetyRouter = (db: Database) => {
    const router = Router();

 // GET /api/gabinety — pobranie listy gabinetów
    router.get('/', (req: Request, res: Response) => {
        try {
            const sql = 'SELECT * FROM gabinety ORDER BY numer_gabinetu ASC';
            const gabinety = db.prepare(sql).all();
            
            res.json({ sukces: true, data: gabinety });
        } catch (error: any) {
            res.status(500).json({ sukces: false, wiadomosc: error.message });
        }
    });

    // POST /api/gabinety — dodanie gabinetu
    router.post('/', (req: Request, res: Response) => {
        const { numer, opis } = req.body;

        try {
            if (!numer) {
                return res.status(400).json({ sukces: false, wiadomosc: 'Brakuje numeru gabinetu' });
            }

            const sprawdzGabinet = db.prepare('SELECT id FROM gabinety WHERE numer_gabinetu = ?').get(numer);
            
            if (sprawdzGabinet) {
                return res.status(400).json({ 
                    sukces: false, 
                    wiadomosc: `Gabinet o numerze ${numer} już istnieje w systemie` 
                });
            }

            const sql = 'INSERT INTO gabinety (numer_gabinetu) VALUES (?)';
            const stmt = db.prepare(sql);
            const info = stmt.run(numer);

    
            zapiszAudyt(db, 'Admin', 'DODANIE_GABINETU', `Utworzono nowy gabinet: ${numer}`);

            res.json({
                sukces: true,
                wiadomosc: 'Gabinet został dodany',
                id: info.lastInsertRowid
            });
        } catch (error: any) {
            console.error('Błąd dodawania gabinetu:', error);
            res.status(500).json({ sukces: false, wiadomosc: error.message });
        }
    });

    return router;
};
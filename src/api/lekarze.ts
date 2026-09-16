import { Router, Request, Response } from 'express';
import { Database } from 'better-sqlite3';
import { zapiszAudyt } from './audyt';

export const lekarzeRouter = (db: Database) => {
    const router = Router();

    // GET /api/lekarze — pobranie listy lekarzy
    router.get('/', (req: Request, res: Response) => {
        try {
            const sql = `
                SELECT l.*, g.numer_gabinetu 
                FROM lekarze l
                LEFT JOIN gabinety g ON l.gabinet_id = g.id
                ORDER BY polish_sort_key(l.nazwisko) ASC
            `;
            const lekarze = db.prepare(sql).all();

            res.json({ sukces: true, data: lekarze });
        } catch (error: any) {
            res.status(500).json({ sukces: false, wiadomosc: error.message });
        }
    });

    // POST /api/lekarze — dodanie lekarza
    router.post('/', (req: Request, res: Response) => {
        const { imie, nazwisko, specjalizacja, email } = req.body;

        try {
            if (!imie || !nazwisko) {
                return res.status(400).json({ sukces: false, wiadomosc: 'Brakuje imienia lub nazwiska lekarza' });
            }

            const sql = 'INSERT INTO lekarze (imie, nazwisko, specjalizacja, email) VALUES (?, ?, ?, ?)';
            const stmt = db.prepare(sql);
            const info = stmt.run(imie, nazwisko, specjalizacja, email || '');

            zapiszAudyt(db, 'Admin', 'DODANIE_LEKARZA', `Dodano lekarza: dr ${imie} ${nazwisko} (${specjalizacja || 'Brak spec.'})`);

            res.json({
                sukces: true,
                wiadomosc: 'Lekarz został dodany',
                id: info.lastInsertRowid
            });
        } catch (error: any) {
            console.error('Błąd dodawania lekarza:', error);
            res.status(500).json({ sukces: false, wiadomosc: error.message });
        }
    });

  
   // PATCH /api/lekarze/:id/archiwizuj — archiwizacja lub przywrócenie lekarza
    router.patch('/:id/archiwizuj', (req: Request, res: Response) => {
        const id = req.params.id;
        const { czy_aktywny } = req.body;

        try {
            const sql = 'UPDATE lekarze SET czy_aktywny = ? WHERE id = ?';
            const stmt = db.prepare(sql);
            const info = stmt.run(czy_aktywny, id);

            if (info.changes === 0) {
                return res.status(404).json({ sukces: false, wiadomosc: 'Nie znaleziono lekarza' });
            }

            const statusTekst = czy_aktywny === 1 ? 'Przywrócono z archiwum' : 'Zarchiwizowano';
            zapiszAudyt(db, 'Admin', 'STATUS_LEKARZA', `${statusTekst} lekarza o ID: ${id}`);

            res.json({ sukces: true, wiadomosc: 'Status lekarza został zaktualizowany' });
        } catch (error: any) {
            console.error('Błąd archiwizacji lekarza:', error);
            res.status(500).json({ sukces: false, wiadomosc: error.message });
        }
    });

     // PUT /api/lekarze/:id — aktualizacja danych lekarza
    router.put('/:id', (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { imie, nazwisko, specjalizacja, email } = req.body;

            const sql = `UPDATE lekarze SET imie = ?, nazwisko = ?, specjalizacja = ?, email = ? WHERE id = ?`;
            const wynik = db.prepare(sql).run(imie, nazwisko, specjalizacja, email, id);

            if (wynik.changes > 0) {
                zapiszAudyt(db, 'Admin', 'EDYCJA_LEKARZA', `Zaktualizowano dane lekarza ID: ${id}`);
                res.json({ sukces: true, wiadomosc: 'Dane lekarza zaktualizowane' });
            } else {
                res.status(404).json({ sukces: false, wiadomosc: 'Nie znaleziono takiego lekarza w bazie' });
            }
        } catch (error: any) {
            res.status(500).json({ sukces: false, wiadomosc: error.message });
        }
    });

    // PATCH /api/lekarze/:id/gabinet — zmiana gabinetu lekarza
    router.patch('/:id/gabinet', (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { nowy_gabinet } = req.body;

            if (!nowy_gabinet) {
                return res.status(400).json({ sukces: false, wiadomosc: 'Nie podano numeru gabinetu' });
            }

            const sqlZnajdGabinet = `SELECT id FROM gabinety WHERE id = ? OR numer_gabinetu = ?`;
            const znalezionyGabinet = db.prepare(sqlZnajdGabinet).get(nowy_gabinet, nowy_gabinet) as any;

            if (!znalezionyGabinet) {
                return res.status(400).json({ sukces: false, wiadomosc: 'Taki gabinet nie istnieje w bazie' });
            }

            const doceloweGabinetId = znalezionyGabinet.id;

            const sqlSprawdzZajety = `
                SELECT id, imie, nazwisko 
                FROM lekarze 
                WHERE gabinet_id = ? AND id != ? AND czy_aktywny = 1
            `;
            const zajety = db.prepare(sqlSprawdzZajety).get(doceloweGabinetId, id) as any;

            if (zajety) {
                return res.status(400).json({
                    sukces: false,
                    wiadomosc: `Ten gabinet jest już zajęty przez: dr ${zajety.imie} ${zajety.nazwisko}.`
                });
            }

            const sqlUpdate = `UPDATE lekarze SET gabinet_id = ? WHERE id = ?`;
            const wynik = db.prepare(sqlUpdate).run(doceloweGabinetId, id);

            if (wynik.changes > 0) {
                zapiszAudyt(db, 'Admin', 'ZMIANA_GABINETU', `Przypisano gabinet ID ${doceloweGabinetId} dla lekarza o ID: ${id}`);

                res.json({ sukces: true, wiadomosc: 'Gabinet został zmieniony' });
            } else {
                res.status(404).json({ sukces: false, wiadomosc: 'Nie znaleziono lekarza' });
            }
        } catch (error: any) {
            console.error('Błąd zmiany gabinetu:', error);
            res.status(500).json({ sukces: false, wiadomosc: 'Błąd serwera bazy danych' });
        }
    });
    return router;
};
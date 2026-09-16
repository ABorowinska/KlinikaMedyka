import { Router, Request, Response } from 'express';
import { Database } from 'better-sqlite3';
import multer from 'multer';
import { zapiszAudyt } from './audyt';

const upload = multer({ storage: multer.memoryStorage() });

export const pacjenciRouter = (db: Database) => {
    const router = Router();

    // POST /api/pacjenci/import — import pacjentów z pliku CSV
    router.post('/import', upload.single('plik'), (req: Request, res: Response) => {
        try {
            if (!req.file) {
                return res.status(400).json({ sukces: false, wiadomosc: 'Brak pliku do zaimportowania' });
            }

            const csvData = req.file.buffer.toString('utf-8');
            const wiersze = csvData.split('\n');

            let dodanych = 0;
            let pominietych = 0;

            const insertPacjent = db.prepare('INSERT OR IGNORE INTO pacjenci (imie, nazwisko, pesel, data_urodzenia, email) VALUES (?, ?, ?, ?, ?)');

            // Transakcja wycofuje cały import, jeśli podczas zapisu wystąpi błąd.
            db.transaction(() => {
                for (let i = 1; i < wiersze.length; i++) {
                    const linia = wiersze[i].trim();
                    if (!linia) continue;

                    const kolumny = linia.split(/[,;]/);

                    if (kolumny.length >= 3) {
                        const imie = kolumny[0]?.trim();
                        const nazwisko = kolumny[1]?.trim();
                        const pesel = kolumny[2]?.trim();
                        const data_ur = kolumny[3]?.trim() || null;
                        const email = kolumny[4]?.trim() || null;

                        if (imie && nazwisko && pesel) {
                            const info = insertPacjent.run(imie, nazwisko, pesel, data_ur, email);
                            if (info.changes > 0) {
                                dodanych++;
                            } else {
                                pominietych++;
                            }
                        }
                    }
                }
            })();


            zapiszAudyt(db, 'Admin', 'IMPORT_CSV', `Zakończono import danych z pliku.Dodano pacjentów: ${dodanych}, pominięto duplikatów: ${pominietych}`);

            res.json({
                sukces: true,
                wiadomosc: `Import udany.Dodano pacjentów: ${dodanych}. Pominięto duplikatów: ${pominietych}.`
            });

        } catch (error: any) {
            console.error('Błąd importu CSV:', error);
            res.status(500).json({ sukces: false, wiadomosc: 'Wystąpił błąd podczas analizy pliku' });
        }
    });

    // GET /api/pacjenci — pobranie listy pacjentów
    router.get('/', (req: Request, res: Response) => {
        try {
            const sql = 'SELECT * FROM pacjenci ORDER BY polish_sort_key(nazwisko) ASC';
            const pacjenci = db.prepare(sql).all();

            res.json({
                sukces: true,
                data: pacjenci
            });
        } catch (error: any) {
            res.status(500).json({ sukces: false, wiadomosc: error.message });
        }
    });

    // POST /api/pacjenci — dodanie pacjenta
    router.post('/', (req: Request, res: Response) => {
        const { imie, nazwisko, pesel, data_urodzenia, email } = req.body;

        try {
            if (!imie || !nazwisko || !pesel) {
                return res.status(400).json({ sukces: false, wiadomosc: 'Brakuje wymaganych pól (imię, nazwisko, PESEL)' });
            }

            const sql = 'INSERT INTO pacjenci (imie, nazwisko, pesel, data_urodzenia,email) VALUES (?, ?, ?, ?,?)';
            const stmt = db.prepare(sql);
            const info = stmt.run(imie, nazwisko, pesel, data_urodzenia, email || null);

            zapiszAudyt(db, 'Admin', 'DODANIE_PACJENTA', `Dodano pacjenta: ${imie} ${nazwisko} (PESEL: ${pesel})`);

            res.json({
                sukces: true,
                wiadomosc: 'Pacjent został dodany',
                id: info.lastInsertRowid
            });
        } catch (error: any) {
            console.error('Błąd dodawania pacjenta:', error);
            res.status(500).json({ sukces: false, wiadomosc: error.message });
        }
    });

    // PATCH /api/pacjenci/:id/archiwizuj — archiwizacja lub przywrócenie pacjenta
    router.patch('/:id/archiwizuj', (req: Request, res: Response) => {
        const id = req.params.id;
        const { czy_aktywny } = req.body;

        try {
            const sql = 'UPDATE pacjenci SET czy_aktywny = ? WHERE id = ?';
            const stmt = db.prepare(sql);
            const info = stmt.run(czy_aktywny, id);

            if (info.changes === 0) {
                return res.status(404).json({ sukces: false, wiadomosc: 'Nie znaleziono pacjenta' });
            }

            const statusTekst = czy_aktywny === 1 ? 'Przywrócono z archiwum' : 'Zarchiwizowano';
            zapiszAudyt(db, 'Admin', 'STATUS_PACJENTA', `${statusTekst} pacjenta o ID: ${id}`);

            res.json({ sukces: true, wiadomosc: 'Status pacjenta został zaktualizowany' });
        } catch (error: any) {
            console.error('Błąd archiwizacji pacjenta:', error);
            res.status(500).json({ sukces: false, wiadomosc: error.message });
        }
    });

    // PUT /api/pacjenci/:id — aktualizacja danych pacjenta
    router.put('/:id', (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { imie, nazwisko, pesel, data_urodzenia, email } = req.body;
            const czystaData = data_urodzenia.includes('T') ? data_urodzenia.split('T')[0] : data_urodzenia;

            const sql = `UPDATE pacjenci SET imie = ?, nazwisko = ?, pesel = ?, data_urodzenia = ?, email = ? WHERE id = ?`;
            const wynik = db.prepare(sql).run(imie, nazwisko, pesel, czystaData, email, id);

            if (wynik.changes > 0) {
                zapiszAudyt(db, 'Admin', 'EDYCJA_PACJENTA', `Zaktualizowano dane pacjenta ID: ${id}`);
                res.json({ sukces: true, wiadomosc: 'Dane pacjenta zaktualizowane' });
            } else {
                res.status(404).json({ sukces: false, wiadomosc: 'Nie znaleziono takiego pacjenta w bazie' });
            }
        } catch (error: any) {
            res.status(500).json({ sukces: false, wiadomosc: error.message });
        }
    });

    return router;
};
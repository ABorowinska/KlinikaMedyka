import { Router, Request, Response } from 'express';
import { Database } from 'better-sqlite3';
import multer from 'multer';
import { zapiszAudyt } from './audyt';
import { requireRole } from '../middleware/auth';

const upload = multer({ storage: multer.memoryStorage() });

export const pacjenciRouter = (db: Database) => {
    const router = Router();

    // POST /api/pacjenci/import — import pacjentów z pliku CSV
    router.post(
        '/import',
        requireRole('ADMIN', 'RECEPCJA'),
        upload.single('plik'),
        (req: Request, res: Response) => {
            try {
                if (!req.file) {
                    return res.status(400).json({
                        sukces: false,
                        wiadomosc: 'Brak pliku do zaimportowania'
                    });
                }

                const csvData = req.file.buffer.toString('utf-8');
                const wiersze = csvData.split('\n');

                let dodanych = 0;
                let pominietych = 0;

                const sprawdzPacjenta = db.prepare(`
                    SELECT id
                    FROM pacjenci
                    WHERE pesel = ?
                `);

                const insertOsoba = db.prepare(`
                    INSERT INTO osoby (
                        imie,
                        nazwisko,
                        email,
                        telefon
                    )
                    VALUES (?, ?, ?, ?)
                `);

                const insertPacjent = db.prepare(`
                    INSERT INTO pacjenci (
                        osoba_id,
                        imie,
                        nazwisko,
                        pesel,
                        data_urodzenia,
                        email
                    )
                    VALUES (?, ?, ?, ?, ?, ?)
                `);

                const importPacjentow = db.transaction(() => {
                    for (let i = 1; i < wiersze.length; i++) {
                        const linia = wiersze[i].trim();

                        if (!linia) {
                            continue;
                        }

                        const kolumny = linia.split(/[,;]/);

                        if (kolumny.length < 3) {
                            continue;
                        }

                        const imie = kolumny[0]?.trim();
                        const nazwisko = kolumny[1]?.trim();
                        const pesel = kolumny[2]?.trim();
                        const dataUrodzenia = kolumny[3]?.trim() || null;
                        const email = kolumny[4]?.trim() || null;
                        const telefon = kolumny[5]?.trim() || null;

                        if (!imie || !nazwisko || !pesel) {
                            continue;
                        }

                        const istniejacyPacjent = sprawdzPacjenta.get(pesel);

                        if (istniejacyPacjent) {
                            pominietych++;
                            continue;
                        }

                        const osobaInfo = insertOsoba.run(
                            imie,
                            nazwisko,
                            email,
                            telefon
                        );

                        const osobaId = Number(
                            osobaInfo.lastInsertRowid
                        );

                        insertPacjent.run(
                            osobaId,
                            imie,
                            nazwisko,
                            pesel,
                            dataUrodzenia,
                            email
                        );

                        dodanych++;
                    }
                });

                importPacjentow();

                const uzytkownik =
                    req.session.user?.username ?? 'System';

                zapiszAudyt(
                    db,
                    uzytkownik,
                    'IMPORT_CSV',
                    `Zakończono import danych z pliku. Dodano pacjentów: ${dodanych}, pominięto duplikatów: ${pominietych}`
                );

                return res.json({
                    sukces: true,
                    wiadomosc:
                        `Import udany. Dodano pacjentów: ${dodanych}. ` +
                        `Pominięto duplikatów: ${pominietych}.`
                });
            } catch (error: any) {
                console.error('Błąd importu CSV:', error);

                return res.status(500).json({
                    sukces: false,
                    wiadomosc: 'Wystąpił błąd podczas analizy pliku'
                });
            }
        }
    );

    // GET /api/pacjenci — pobranie listy pacjentów
    router.get(
        '/',
        requireRole('ADMIN', 'RECEPCJA', 'LEKARZ'),
        (req: Request, res: Response) => {
            try {
                const sql =
                    'SELECT * FROM pacjenci ORDER BY polish_sort_key(nazwisko) ASC';

                const pacjenci = db.prepare(sql).all();

                return res.json({
                    sukces: true,
                    data: pacjenci
                });
            } catch (error: any) {
                return res.status(500).json({
                    sukces: false,
                    wiadomosc: error.message
                });
            }
        }
    );

    // POST /api/pacjenci — dodanie pacjenta
    router.post(
        '/',
        requireRole('ADMIN', 'RECEPCJA'),
        (req: Request, res: Response) => {
            const {
                imie,
                nazwisko,
                pesel,
                data_urodzenia,
                email,
                telefon
            } = req.body;

            try {
                if (!imie || !nazwisko || !pesel) {
                    return res.status(400).json({
                        sukces: false,
                        wiadomosc:
                            'Brakuje wymaganych pól (imię, nazwisko, PESEL)'
                    });
                }

                const dodajPacjenta = db.transaction(() => {
                    const osobaInfo = db.prepare(`
                        INSERT INTO osoby (
                            imie,
                            nazwisko,
                            email,
                            telefon
                        )
                        VALUES (?, ?, ?, ?)
                    `).run(
                        imie,
                        nazwisko,
                        email || null,
                        telefon || null
                    );

                    const osobaId = Number(
                        osobaInfo.lastInsertRowid
                    );

                    const pacjentInfo = db.prepare(`
                        INSERT INTO pacjenci (
                            osoba_id,
                            imie,
                            nazwisko,
                            pesel,
                            data_urodzenia,
                            email
                        )
                        VALUES (?, ?, ?, ?, ?, ?)
                    `).run(
                        osobaId,
                        imie,
                        nazwisko,
                        pesel,
                        data_urodzenia || null,
                        email || null
                    );

                    return {
                        osobaId,
                        pacjentId: Number(
                            pacjentInfo.lastInsertRowid
                        )
                    };
                });

                const wynik = dodajPacjenta();

                const uzytkownik =
                    req.session.user?.username ?? 'System';

                zapiszAudyt(
                    db,
                    uzytkownik,
                    'DODANIE_PACJENTA',
                    `Dodano pacjenta: ${imie} ${nazwisko} (PESEL: ${pesel})`
                );

                return res.status(201).json({
                    sukces: true,
                    wiadomosc: 'Pacjent został dodany',
                    id: wynik.pacjentId,
                    osoba_id: wynik.osobaId
                });
            } catch (error: any) {
                console.error(
                    'Błąd dodawania pacjenta:',
                    error
                );

                return res.status(500).json({
                    sukces: false,
                    wiadomosc: error.message
                });
            }
        }
    );

    // PATCH /api/pacjenci/:id/archiwizuj — archiwizacja lub przywrócenie pacjenta
    router.patch(
        '/:id/archiwizuj',
        requireRole('ADMIN', 'RECEPCJA'),
        (req: Request, res: Response) => {
            const id = req.params.id;
            const { czy_aktywny } = req.body;

            try {
                if (
                    czy_aktywny !== 0 &&
                    czy_aktywny !== 1
                ) {
                    return res.status(400).json({
                        sukces: false,
                        wiadomosc:
                            'Nieprawidłowa wartość czy_aktywny'
                    });
                }

                const zmienStatusPacjenta =
                    db.transaction(() => {
                        const pacjent = db.prepare(`
                            SELECT id, osoba_id
                            FROM pacjenci
                            WHERE id = ?
                        `).get(id) as
                            | {
                                  id: number;
                                  osoba_id: number;
                              }
                            | undefined;

                        if (!pacjent) {
                            return null;
                        }

                        db.prepare(`
                            UPDATE pacjenci
                            SET czy_aktywny = ?
                            WHERE id = ?
                        `).run(
                            czy_aktywny,
                            id
                        );

                        const konto = db.prepare(`
                            SELECT id
                            FROM konta_uzytkownikow
                            WHERE osoba_id = ?
                        `).get(
                            pacjent.osoba_id
                        ) as
                            | { id: number }
                            | undefined;

                        if (konto) {
                            db.prepare(`
                                UPDATE konta_role
                                SET aktywna = ?
                                WHERE konto_id = ?
                                  AND rola_id = (
                                      SELECT id
                                      FROM role
                                      WHERE nazwa = 'PACJENT'
                                  )
                            `).run(
                                czy_aktywny,
                                konto.id
                            );
                        }

                        return pacjent;
                    });

                const pacjent =
                    zmienStatusPacjenta();

                if (!pacjent) {
                    return res.status(404).json({
                        sukces: false,
                        wiadomosc:
                            'Nie znaleziono pacjenta'
                    });
                }

                const statusTekst =
                    czy_aktywny === 1
                        ? 'Przywrócono z archiwum'
                        : 'Zarchiwizowano';

                const uzytkownik =
                    req.session.user?.username ??
                    'System';

                zapiszAudyt(
                    db,
                    uzytkownik,
                    'STATUS_PACJENTA',
                    `${statusTekst} pacjenta o ID: ${id}`
                );

                return res.json({
                    sukces: true,
                    wiadomosc:
                        'Status pacjenta został zaktualizowany'
                });
            } catch (error: any) {
                console.error(
                    'Błąd archiwizacji pacjenta:',
                    error
                );

                return res.status(500).json({
                    sukces: false,
                    wiadomosc: error.message
                });
            }
        }
    );

    // PUT /api/pacjenci/:id — aktualizacja danych pacjenta
    router.put(
        '/:id',
        requireRole('ADMIN', 'RECEPCJA'),
        (req: Request, res: Response) => {
            const { id } = req.params;

            const {
                imie,
                nazwisko,
                pesel,
                data_urodzenia,
                email,
                telefon
            } = req.body;

            try {
                if (!imie || !nazwisko || !pesel) {
                    return res.status(400).json({
                        sukces: false,
                        wiadomosc:
                            'Brakuje wymaganych pól (imię, nazwisko, PESEL)'
                    });
                }

                const czystaData = data_urodzenia
                    ? data_urodzenia.includes('T')
                        ? data_urodzenia.split('T')[0]
                        : data_urodzenia
                    : null;

                const aktualizujPacjenta =
                    db.transaction(() => {
                        const pacjent = db.prepare(`
                            SELECT id, osoba_id
                            FROM pacjenci
                            WHERE id = ?
                        `).get(id) as
                            | {
                                  id: number;
                                  osoba_id: number;
                              }
                            | undefined;

                        if (!pacjent) {
                            return false;
                        }

                        db.prepare(`
                            UPDATE osoby
                            SET
                                imie = ?,
                                nazwisko = ?,
                                email = ?,
                                telefon = ?,
                                zaktualizowano_at = CURRENT_TIMESTAMP
                            WHERE id = ?
                        `).run(
                            imie,
                            nazwisko,
                            email || null,
                            telefon || null,
                            pacjent.osoba_id
                        );

                        db.prepare(`
                            UPDATE pacjenci
                            SET
                                imie = ?,
                                nazwisko = ?,
                                pesel = ?,
                                data_urodzenia = ?,
                                email = ?
                            WHERE id = ?
                        `).run(
                            imie,
                            nazwisko,
                            pesel,
                            czystaData,
                            email || null,
                            id
                        );

                        return true;
                    });

                const zaktualizowano =
                    aktualizujPacjenta();

                if (!zaktualizowano) {
                    return res.status(404).json({
                        sukces: false,
                        wiadomosc:
                            'Nie znaleziono takiego pacjenta w bazie'
                    });
                }

                const uzytkownik =
                    req.session.user?.username ??
                    'System';

                zapiszAudyt(
                    db,
                    uzytkownik,
                    'EDYCJA_PACJENTA',
                    `Zaktualizowano dane pacjenta ID: ${id}`
                );

                return res.json({
                    sukces: true,
                    wiadomosc:
                        'Dane pacjenta zaktualizowane'
                });
            } catch (error: any) {
                console.error(
                    'Błąd aktualizacji pacjenta:',
                    error
                );

                return res.status(500).json({
                    sukces: false,
                    wiadomosc: error.message
                });
            }
        }
    );

    return router;
};
import { Router, Request, Response } from 'express';
import { Database } from 'better-sqlite3';
import { zapiszAudyt } from './audyt';
import { requireRole } from '../middleware/auth';

export const wizytyRouter = (db: Database) => {
    const router = Router();

    // GET /api/wizyty — pobranie wizyt
    router.get(
        '/',
        requireRole('ADMIN', 'RECEPCJA', 'LEKARZ'),
        (req: Request, res: Response) => {
            try {
                const { lekarz_id, data } = req.query;
                const user = req.session.user!;

                const czyAdminLubRecepcja =
                    user.roleNames.includes('ADMIN') ||
                    user.roleNames.includes('RECEPCJA');

                let sql = `
                    SELECT
                        w.id,
                        w.pacjent_id,
                        w.lekarz_id,
                        w.gabinet_id,
                        w.data,
                        w.status,
                        w.uwagi_do_statusu,
                        p.imie || ' ' || p.nazwisko AS pacjent_nazwa,
                        l.imie || ' ' || l.nazwisko AS lekarz_nazwa,
                        g.numer_gabinetu
                    FROM wizyty w
                    JOIN pacjenci p
                        ON w.pacjent_id = p.id
                    JOIN lekarze l
                        ON w.lekarz_id = l.id
                    JOIN gabinety g
                        ON w.gabinet_id = g.id
                    WHERE 1 = 1
                `;

                const params: any[] = [];

                if (data) {
                    sql += ` AND w.data LIKE ?`;
                    params.push(`${data}%`);
                }

                if (czyAdminLubRecepcja) {
                    if (lekarz_id) {
                        sql += ` AND w.lekarz_id = ?`;
                        params.push(lekarz_id);
                    }
                } else {
                    const lekarz = db.prepare(`
                        SELECT id
                        FROM lekarze
                        WHERE osoba_id = ?
                          AND czy_aktywny = 1
                    `).get(user.osobaId) as
                        | { id: number }
                        | undefined;

                    if (!lekarz) {
                        return res.status(403).json({
                            sukces: false,
                            wiadomosc:
                                'Nie znaleziono aktywnego profilu lekarza'
                        });
                    }

                    sql += ` AND w.lekarz_id = ?`;
                    params.push(lekarz.id);
                }

                sql += ` ORDER BY w.data ASC`;

                const wizyty = db
                    .prepare(sql)
                    .all(...params);

                return res.json({
                    sukces: true,
                    data: wizyty
                });
            } catch (error: any) {
                console.error(
                    'Błąd pobierania wizyt:',
                    error
                );

                return res.status(500).json({
                    sukces: false,
                    wiadomosc: error.message
                });
            }
        }
    );

    // POST /api/wizyty — rejestracja nowej wizyty
    router.post(
        '/',
        requireRole('ADMIN', 'RECEPCJA'),
        (req: Request, res: Response) => {
            try {
                const {
                    pacjentId,
                    lekarzId,
                    data,
                    godzina,
                    notatka
                } = req.body;

                if (
                    !pacjentId ||
                    !lekarzId ||
                    !data ||
                    !godzina
                ) {
                    return res.status(400).json({
                        sukces: false,
                        wiadomosc:
                            'Brak wymaganych danych wizyty'
                    });
                }

                const pacjentIdNumber =
                    Number(pacjentId);

                const lekarzIdNumber =
                    Number(lekarzId);

                if (
                    !Number.isInteger(pacjentIdNumber) ||
                    !Number.isInteger(lekarzIdNumber)
                ) {
                    return res.status(400).json({
                        sukces: false,
                        wiadomosc:
                            'Nieprawidłowy identyfikator pacjenta lub lekarza'
                    });
                }

                const pacjent = db.prepare(`
                    SELECT id
                    FROM pacjenci
                    WHERE id = ?
                      AND czy_aktywny = 1
                `).get(pacjentIdNumber) as
                    | { id: number }
                    | undefined;

                if (!pacjent) {
                    return res.status(404).json({
                        sukces: false,
                        wiadomosc:
                            'Nie znaleziono aktywnego pacjenta'
                    });
                }

                const lekarz = db.prepare(`
                    SELECT
                        id,
                        gabinet_id
                    FROM lekarze
                    WHERE id = ?
                      AND czy_aktywny = 1
                `).get(lekarzIdNumber) as
                    | {
                          id: number;
                          gabinet_id: number | null;
                      }
                    | undefined;

                if (!lekarz) {
                    return res.status(404).json({
                        sukces: false,
                        wiadomosc:
                            'Nie znaleziono aktywnego lekarza'
                    });
                }

                if (!lekarz.gabinet_id) {
                    return res.status(400).json({
                        sukces: false,
                        wiadomosc:
                            'Lekarz nie ma przypisanego gabinetu'
                    });
                }

                const czystaData =
                    String(data).split('T')[0];

                const czystaGodzina =
                    String(godzina).substring(0, 5);

                if (
                    !/^\d{4}-\d{2}-\d{2}$/.test(
                        czystaData
                    ) ||
                    !/^\d{2}:\d{2}$/.test(
                        czystaGodzina
                    )
                ) {
                    return res.status(400).json({
                        sukces: false,
                        wiadomosc:
                            'Nieprawidłowy format daty lub godziny'
                    });
                }

                const dataWizyty =
                    `${czystaData} ${czystaGodzina}:00`;

                const dataObiekt = new Date(
                    `${czystaData}T${czystaGodzina}:00`
                );

                if (
                    Number.isNaN(
                        dataObiekt.getTime()
                    )
                ) {
                    return res.status(400).json({
                        sukces: false,
                        wiadomosc:
                            'Nieprawidłowa data wizyty'
                    });
                }

                const dzienTygodnia =
                    dataObiekt.getDay();

                if (
                    dzienTygodnia === 0 ||
                    dzienTygodnia === 6
                ) {
                    return res.status(400).json({
                        sukces: false,
                        wiadomosc:
                            'Przychodnia jest zamknięta w weekendy'
                    });
                }

                const teraz = new Date();

                if (dataObiekt < teraz) {
                    return res.status(400).json({
                        sukces: false,
                        wiadomosc:
                            'Nie można rejestrować wizyt w przeszłości'
                    });
                }

                const kolizja = db.prepare(`
                    SELECT COUNT(*) AS count
                    FROM wizyty
                    WHERE data = ?
                      AND LOWER(TRIM(status)) != 'anulowana'
                      AND (
                          lekarz_id = ?
                          OR pacjent_id = ?
                          OR gabinet_id = ?
                      )
                `).get(
                    dataWizyty,
                    lekarzIdNumber,
                    pacjentIdNumber,
                    lekarz.gabinet_id
                ) as { count: number };

                if (kolizja.count > 0) {
                    return res.status(409).json({
                        sukces: false,
                        wiadomosc:
                            'Wybrany termin jest już zajęty dla lekarza, pacjenta lub gabinetu'
                    });
                }

                const info = db.prepare(`
                    INSERT INTO wizyty (
                        pacjent_id,
                        lekarz_id,
                        data,
                        status,
                        uwagi_do_statusu,
                        gabinet_id
                    )
                    VALUES (
                        ?,
                        ?,
                        ?,
                        'zaplanowana',
                        ?,
                        ?
                    )
                `).run(
                    pacjentIdNumber,
                    lekarzIdNumber,
                    dataWizyty,
                    notatka || '',
                    lekarz.gabinet_id
                );

                const uzytkownik =
                    req.session.user?.username ??
                    'System';

                zapiszAudyt(
                    db,
                    uzytkownik,
                    'REJESTRACJA_WIZYTY',
                    `Zarejestrowano wizytę dla pacjenta (ID: ${pacjentIdNumber}) do lekarza (ID: ${lekarzIdNumber}) na termin: ${dataWizyty}`
                );

                const wss = req.app.get('wss');

                if (wss) {
                    const powiadomienie =
                        JSON.stringify({
                            type: 'SYSTEM_WIZYTA',
                            text:
                                `Zarejestrowano nową wizytę na termin: ${dataWizyty}`,
                            lekarz_id:
                                lekarzIdNumber
                        });

                    wss.clients.forEach(
                        (client: any) => {
                            if (
                                client.readyState === 1
                            ) {
                                client.send(
                                    powiadomienie
                                );
                            }
                        }
                    );
                }

                return res.status(201).json({
                    sukces: true,
                    wiadomosc: 'Wizyta zapisana',
                    noweId:
                        info.lastInsertRowid
                });
            } catch (error: any) {
                console.error(
                    'Błąd rejestracji wizyty:',
                    error
                );

                return res.status(500).json({
                    sukces: false,
                    wiadomosc: error.message
                });
            }
        }
    );

    // PATCH /api/wizyty/:id/status — zmiana statusu wizyty
    router.patch(
        '/:id/status',
        requireRole(
            'ADMIN',
            'RECEPCJA',
            'LEKARZ'
        ),
        (req: Request, res: Response) => {
            try {
                const { id } = req.params;

                const {
                    nowyStatus,
                    uwagi_do_statusu
                } = req.body;

                const user =
                    req.session.user!;

                const status = String(
                    nowyStatus || ''
                ).toLowerCase();

                const dozwoloneStatusy = [
                    'zaplanowana',
                    'odbyta',
                    'anulowana'
                ];

                if (
                    !dozwoloneStatusy.includes(
                        status
                    )
                ) {
                    return res.status(400).json({
                        sukces: false,
                        wiadomosc:
                            'Nieprawidłowy status wizyty'
                    });
                }

                const wizyta = db.prepare(`
                    SELECT
                        id,
                        lekarz_id
                    FROM wizyty
                    WHERE id = ?
                `).get(id) as
                    | {
                          id: number;
                          lekarz_id: number;
                      }
                    | undefined;

                if (!wizyta) {
                    return res.status(404).json({
                        sukces: false,
                        wiadomosc:
                            'Nie znaleziono takiej wizyty'
                    });
                }

                const czyAdminLubRecepcja =
                    user.roleNames.includes(
                        'ADMIN'
                    ) ||
                    user.roleNames.includes(
                        'RECEPCJA'
                    );

                if (!czyAdminLubRecepcja) {
                    const lekarz = db.prepare(`
                        SELECT id
                        FROM lekarze
                        WHERE osoba_id = ?
                          AND czy_aktywny = 1
                    `).get(user.osobaId) as
                        | { id: number }
                        | undefined;

                    if (
                        !lekarz ||
                        lekarz.id !==
                            wizyta.lekarz_id
                    ) {
                        return res.status(403).json({
                            sukces: false,
                            wiadomosc:
                                'Nie masz uprawnień do zmiany tej wizyty'
                        });
                    }
                }

                const uwagi =
                    typeof uwagi_do_statusu ===
                    'string'
                        ? uwagi_do_statusu
                        : null;

                db.prepare(`
                    UPDATE wizyty
                    SET
                        status = ?,
                        uwagi_do_statusu =
                            COALESCE(
                                ?,
                                uwagi_do_statusu
                            )
                    WHERE id = ?
                `).run(
                    status,
                    uwagi,
                    id
                );

                const uzytkownik =
                    user.username;

                zapiszAudyt(
                    db,
                    uzytkownik,
                    'ZMIANA_STATUSU_WIZYTY',
                    `Zmieniono status wizyty o ID: ${id} na: ${status}`
                );

                const wss =
                    req.app.get('wss');

                if (wss) {
                    const powiadomienie =
                        JSON.stringify({
                            type: 'SYSTEM_WIZYTA',
                            text:
                                `Zmieniono status wizyty #${id} na: ${status}`,
                            lekarz_id:
                                wizyta.lekarz_id
                        });

                    wss.clients.forEach(
                        (client: any) => {
                            if (
                                client.readyState === 1
                            ) {
                                client.send(
                                    powiadomienie
                                );
                            }
                        }
                    );
                }

                return res.json({
                    sukces: true,
                    wiadomosc:
                        `Zmieniono status wizyty na: ${status}`
                });
            } catch (error: any) {
                console.error(
                    'Błąd zmiany statusu wizyty:',
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
import { Router, Request, Response } from 'express';
import { Database } from 'better-sqlite3';
import { zapiszAudyt } from './audyt'; 

export const wizytyRouter = (db: Database) => {
    const router = Router();
// GET /api/wizyty — pobranie wizyt z opcjonalnym filtrem daty i lekarza
    router.get('/', (req: Request, res: Response) => {
        try {
            const { lekarz_id, rola, data } = req.query;
            let sql = `
                SELECT 
                    w.id, w.data, w.status, w.uwagi_do_statusu, w.lekarz_id,
                    p.imie || ' ' || p.nazwisko AS pacjent_nazwa,
                    l.imie || ' ' || l.nazwisko AS lekarz_nazwa,
                    g.numer_gabinetu
                FROM wizyty w
                JOIN pacjenci p ON w.pacjent_id = p.id
                JOIN lekarze l ON w.lekarz_id = l.id
                JOIN gabinety g ON w.gabinet_id = g.id
                WHERE 1=1
            `;

            const params: any[] = [];
            if (data) {
                sql += ` AND w.data LIKE ?`;
                params.push(`${data}%`); 
            }
            if (lekarz_id) {
                sql += ` AND w.lekarz_id = ?`;
                params.push(lekarz_id);
            }

            sql += ` ORDER BY w.data ASC`;
            
            const wizyty = db.prepare(sql).all(...params);
            res.json({ sukces: true, data: wizyty });
        } catch (error: any) {
            res.status(500).json({ sukces: false, wiadomosc: error.message });
        }
    });
// POST /api/wizyty — rejestracja nowej wizyty
    router.post('/', (req: Request, res: Response) => {
        try {
            const { pacjentId, lekarzId, gabinetId, data, godzina, notatka } = req.body;
            
            if (!pacjentId || !lekarzId || !data || !godzina) {
                return res.status(400).json({ sukces: false, wiadomosc: 'Brak wymaganych danych wizyty' });
            }

            const czystaData = new Date(data).toISOString().split('T')[0]; 
            const dataWizyty = `${czystaData} ${godzina}:00`; 
            const dataObiekt = new Date(dataWizyty);
            const dzienTygodnia = dataObiekt.getDay();

            if (dzienTygodnia === 0 || dzienTygodnia === 6) {
                return res.status(400).json({ sukces: false, wiadomosc: 'Przychodnia jest zamknięta w weekendy' });
            }

            const dzis = new Date();
            dzis.setHours(0, 0, 0, 0);
            if (dataObiekt < dzis) {
                return res.status(400).json({ sukces: false, wiadomosc: 'Nie można rejestrować wizyt w przeszłości' });
            }

            let idGabinetu = gabinetId;
            if (!idGabinetu) {
                const lek = db.prepare('SELECT numer_gabinetu FROM lekarze WHERE id = ?').get(lekarzId) as any;
                idGabinetu = lek?.numer_gabinetu || 1;
            }

           const szukanaData = dataWizyty.substring(0, 16) + '%'; 
            
            const kolizjaSql = `
                SELECT COUNT(*) as count 
                FROM wizyty 
                WHERE data LIKE ? AND (lekarz_id = ? OR pacjent_id = ?) AND LOWER(TRIM(status)) != 'anulowana'
            `;
            const kolizja = db.prepare(kolizjaSql).get(szukanaData, lekarzId, pacjentId) as { count: number };
            // Termin jest niedostępny, jeśli lekarz lub pacjent ma już aktywną wizytę.
            if (kolizja && kolizja.count > 0) {
                return res.status(400).json({ 
                    sukces: false, 
                    wiadomosc: 'W tym terminie ten lekarz ma już zapisaną wizytę, albo ten pacjent jest już umówiony do kogoś innego o tej samej godzinie' 
                });
            }

            const sql = `INSERT INTO wizyty (pacjent_id, lekarz_id, data, status, uwagi_do_statusu, gabinet_id) VALUES (?, ?, ?, 'zaplanowana', ?, ?)`;
            const info = db.prepare(sql).run(pacjentId, lekarzId, dataWizyty, notatka || '', idGabinetu);
            
            zapiszAudyt(db, 'Recepcja', 'REJESTRACJA_WIZYTY', `Zarejestrowano wizytę dla pacjenta (ID: ${pacjentId}) do lekarza (ID: ${lekarzId}) na termin: ${dataWizyty}`);

        // Powiadomienie aktywnych klientów WebSocket o utworzeniu wizyty. 
            const wss = req.app.get('wss');
            if (wss) {
                const powiadomienie = JSON.stringify({ 
                    type: 'SYSTEM_WIZYTA', 
                    text: `Zarejestrowano nową wizytę na termin: ${dataWizyty}`,
                    lekarz_id: Number(lekarzId) 
                });
                wss.clients.forEach((client: any) => {
                    if (client.readyState === 1) client.send(powiadomienie);
                });
            }

            res.status(201).json({ sukces: true, wiadomosc: 'Wizyta zapisana', noweId: info.lastInsertRowid });
        } catch (error: any) {
            res.status(500).json({ sukces: false, wiadomosc: error.message });
        }
    });
// PATCH /api/wizyty/:id/status — aktualizacja statusu i notatki wizyty
    router.patch('/:id/status', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nowyStatus, uwagi_do_statusu, uzytkownik } = req.body;

    const dozwoloneStatusy = ['zaplanowana', 'odbyta', 'anulowana'];

    if (
      !nowyStatus ||
      !dozwoloneStatusy.includes(String(nowyStatus).toLowerCase())
    ) {
      return res.status(400).json({
        sukces: false,
        wiadomosc: 'Nieprawidłowy status wizyty'
      });
    }

    const uwagi =
      typeof uwagi_do_statusu === 'string'
        ? uwagi_do_statusu
        : null;

    const sql = `
      UPDATE wizyty
      SET status = ?,
          uwagi_do_statusu = COALESCE(?, uwagi_do_statusu)
      WHERE id = ?
    `;

    const wynik = db.prepare(sql).run(
      nowyStatus,
      uwagi,
      id
    );

    if (wynik.changes === 0) {
      return res.status(404).json({
        sukces: false,
        wiadomosc: 'Nie znaleziono takiej wizyty'
      });
    }

    zapiszAudyt(
      db,
      uzytkownik || 'Recepcja/Admin',
      'ZMIANA_STATUSU_WIZYTY',
      `Zmieniono status wizyty o ID: ${id} na: ${nowyStatus}`
    );

    const wss = req.app.get('wss');

    if (wss) {
      const wizytaInfo = db
        .prepare('SELECT lekarz_id FROM wizyty WHERE id = ?')
        .get(id) as any;

      const powiadomienie = JSON.stringify({
        type: 'SYSTEM_WIZYTA',
        text: ` Zmieniono status wizyty #${id} na: ${nowyStatus}`,
        lekarz_id: wizytaInfo?.lekarz_id
      });

      wss.clients.forEach((client: any) => {
        if (client.readyState === 1) {
          client.send(powiadomienie);
        }
      });
    }

    return res.json({
      sukces: true,
      wiadomosc: `Zmieniono status wizyty na: ${nowyStatus}`
    });
  } catch (error: any) {
    return res.status(500).json({
      sukces: false,
      wiadomosc: error.message
    });
  }
});
    return router;
};